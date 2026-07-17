
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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

/**
 * The client asks for a filename (F01_Red_Fighter_Song01.mp3) and it lands in a
 * Content-Disposition header, so it is never trusted: a CR/LF would let the
 * caller inject headers, and a quote would break out of the filename. Keep a
 * conservative charset and cap the length rather than try to escape.
 */
function safeFilename(raw: unknown): string {
  if (typeof raw !== 'string') return 'download.mp3';
  const base = raw
    .replace(/\.mp3$/i, '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);
  return base ? `${base}.mp3` : 'download.mp3';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Auth for the WHOLE route, before dispatch.
    //
    // It used to guard 'upload' alone, leaving check/download open: anyone on
    // the internet could spawn yt-dlp on this machine — free CPU and bandwidth,
    // and a YouTube rate-limit lands on the host's IP. The only anonymous
    // caller was /public/music-submission, now removed: athlete submission
    // lives inside the authenticated app. Gating here rather than per-action
    // means a new action cannot forget to.
    const { createClient } = await import('@/lib/supabase/server');
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // ACTION: DOWNLOAD
    if (action === 'download') {
        // yt-dlp CANNOT post-process to stdout: converting needs a real file on
        // disk, so `-x --audio-format mp3 -o -` silently streams the raw WebM
        // and the old code shipped it as audio/mpeg named .mp3. Players that
        // trust the extension choke on it — an arena PA is not the place to
        // find that out. Convert on disk, then stream the real mp3.
        let workDir: string | null = null;
        try {
            workDir = await mkdtemp(join(tmpdir(), 'uaew-song-'));

            const exitCode: number = await new Promise((resolve, reject) => {
                const proc = spawn('yt-dlp', [
                    '-x',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '--no-playlist',
                    '-o', join(workDir!, 'audio.%(ext)s'),
                    '--',
                    url,
                ]);
                proc.stderr.on('data', (d) => console.log(`yt-dlp: ${d}`));
                proc.on('error', reject);
                proc.on('close', resolve);
            });

            if (exitCode !== 0) {
                return NextResponse.json({ error: 'Conversion failed' }, { status: 502 });
            }

            const produced = (await readdir(workDir)).find((f) => f.endsWith('.mp3'));
            if (!produced) {
                return NextResponse.json({ error: 'No audio produced' }, { status: 502 });
            }

            const audio = await readFile(join(workDir, produced));
            return new NextResponse(new Uint8Array(audio), {
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': String(audio.byteLength),
                    'Content-Disposition': `attachment; filename="${safeFilename(body.filename)}"`,
                },
            });
        } catch (err) {
            console.error('[music/convert] download failed:', err);
            return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
        } finally {
            // The temp dir holds the whole track; leaking one per download would
            // quietly fill the disk.
            if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
        }
    }

    // ACTION: UPLOAD (To Supabase)
    if (action === 'upload') {
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
