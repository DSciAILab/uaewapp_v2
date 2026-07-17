
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// Este endpoint é público (ver middleware: /api/public) e passa o input para o
// yt-dlp via spawn. Um `includes('http')` NÃO é validação: '--config-location=/tmp/http'
// passaria e o yt-dlp interpretaria como FLAG (argument injection -> --exec -> RCE).
// Defesa em duas camadas: (1) allowlist de host/protocolo; (2) '--' antes da url
// em todo argv, forçando o yt-dlp a tratá-la como operando, nunca como opção.
const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

// A rota inteira está allowlisted como pública no middleware, mas o action
// 'upload' escreve no bucket 'music' com a SERVICE_ROLE_KEY — ou seja, ignora
// RLS. Sem auth, qualquer anônimo ganha escrita ilimitada de service-role no
// storage (+ CPU de yt-dlp de graça). O gate é feito no handler, não no
// middleware, porque o middleware precisa deixar 'check'/'download' passarem.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB — walkout song, não filme
const MAX_UPLOAD_DURATION_SECONDS = 900; // 15 min

function parseAllowedUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  // Devolve a forma normalizada pelo WHATWG URL, não a string crua.
  return parsed.toString();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { action } = body;

    const url = parseAllowedUrl(body?.url);
    if (!url) {
      return NextResponse.json(
        { error: 'Invalid URL: must be an https YouTube link' },
        { status: 400 }
      );
    }

    // ACTION: CHECK (Get Metadata)
    if (action === 'check') {
        return new Promise<NextResponse>((resolve) => {
            const process = spawn('yt-dlp', ['--dump-json', '--', url]);
            let dataString = '';
            
            process.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            process.stderr.on('data', (data) => {
                console.error(`yt-dlp stderr: ${data}`);
            });

            process.on('close', (code) => {
                if (code !== 0) {
                     resolve(NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 }));
                     return;
                }
                try {
                    const info = JSON.parse(dataString);
                    resolve(NextResponse.json({
                        title: info.title,
                        duration: info.duration,
                        author: info.uploader,
                        thumbnail: info.thumbnail,
                        streamUrl: null // Not exposed in check
                    }));
                } catch(e) {
                    resolve(NextResponse.json({ error: 'Failed to parse video info' }, { status: 500 }));
                }
            });
        });
    }

    // ACTION: DOWNLOAD (Stream to Client)
    if (action === 'download') {
        const ytProcess = spawn('yt-dlp', [
            '-x',
            '--audio-format', 'mp3',
            '-o', '-',
            '--',
            url
        ]);

        const readableStream = new ReadableStream({
            start(controller) {
                ytProcess.stdout.on('data', (chunk) => controller.enqueue(chunk));
                
                ytProcess.stdout.on('end', () => {
                   // End of stream
                });

                ytProcess.stderr.on('data', (data) => {
                    console.log(`yt-dlp stderr: ${data}`);
                });

                ytProcess.on('close', (code) => {
                    if (code !== 0) {
                         console.error(`yt-dlp exited with code ${code}`);
                    }
                    controller.close();
                });

                ytProcess.on('error', (err) => controller.error(err));
            },
            cancel() {
                ytProcess.kill();
            }
        });

        return new NextResponse(readableStream, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="download.mp3"`,
            },
        }) as unknown as NextResponse; 
        // Note: NextResponse usually takes BodyInit. ReadableStream is valid but TS might complain about types in Next 13/14 sometimes.
        // Casting to unknown then NextResponse or just returning Response (polymorphic) is safer.
        // Actually, let's return standard Response if NextResponse complains, but the signature wants NextResponse.
        // The original code returned NextResponse(stream).
        // If TS error persists, we change return type to Promise<Response>.
    }

    // ACTION: UPLOAD (To Supabase)
    if (action === 'upload') {
        // Auth ANTES de qualquer spawn/escrita: sem isto, o service-role abaixo
        // dá escrita anônima ilimitada no bucket. Mesmo padrão de
        // src/app/api/proxy-image/route.ts.
        const { createClient } = await import('@/lib/supabase/server');
        const authClient = await createClient();
        const {
            data: { user },
        } = await authClient.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // PRIORITY: Use Service Role Key (Bypass RLS)
        let supabase;
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient: createAdminClient } = await import('@supabase/supabase-js');
            supabase = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
        } else {
            supabase = authClient;
        }

        // 1. Get Info for Title
        const infoProcess = spawn('yt-dlp', ['--dump-json', '--', url]);
        let infoData = '';
        for await (const chunk of infoProcess.stdout) {
            infoData += chunk;
        }

        if (!infoData) {
             throw new Error('Failed to get video info');
        }

        const info = JSON.parse(infoData);

        // Cap de duração: o --match-filter abaixo já barra no yt-dlp, mas o
        // metadata do --dump-json permite rejeitar antes de gastar o download.
        if (typeof info.duration === 'number' && info.duration > MAX_UPLOAD_DURATION_SECONDS) {
            return NextResponse.json(
                { error: `Track too long: max ${MAX_UPLOAD_DURATION_SECONDS}s` },
                { status: 413 }
            );
        }

        const sanitizedTitle = info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `yt_${Date.now()}_${sanitizedTitle}.mp3`;

        // 2. Stream Download -> Buffer -> Supabase
        const downloadProcess = spawn('yt-dlp', [
            '-f', 'bestaudio',
            '--match-filter', `duration < ${MAX_UPLOAD_DURATION_SECONDS}`,
            '-o', '-',
            '--',
            url
        ]);
        const chunks: Uint8Array[] = [];
        let downloadedBytes = 0;

        // Buffer.concat sem teto = um único request longo estoura a memória do
        // processo. Aborta o yt-dlp assim que passa do cap.
        for await (const chunk of downloadProcess.stdout) {
            downloadedBytes += chunk.length;
            if (downloadedBytes > MAX_UPLOAD_BYTES) {
                downloadProcess.kill('SIGKILL');
                return NextResponse.json(
                    { error: `Track too large: max ${MAX_UPLOAD_BYTES} bytes` },
                    { status: 413 }
                );
            }
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('music')
            .upload(filename, buffer, {
                contentType: 'audio/mpeg',
                upsert: false
            });

        if (uploadError) {
            throw new Error('Supabase Upload Failed: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
            .from('music')
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            title: info.title,
            publicUrl: publicUrl
        });
    }

    // Default: Bad Request
    return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
    );

  } catch (error: any) {
    console.error('YouTube processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
}
