
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { url, action } = body;

    // Basic Validation
    if (!url || !url.includes('http')) {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // ACTION: CHECK (Get Metadata)
    if (action === 'check') {
        return new Promise<NextResponse>((resolve) => {
            const process = spawn('yt-dlp', ['--dump-json', url]);
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
        // PRIORITY: Use Service Role Key (Bypass RLS)
        let supabase;
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient: createAdminClient } = await import('@supabase/supabase-js');
            supabase = createAdminClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!, 
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
        } else {
            const { createClient: createServerClient } = await import('@/lib/supabase/server');
            supabase = await createServerClient();
        }
        
        // 1. Get Info for Title
        const infoProcess = spawn('yt-dlp', ['--dump-json', url]);
        let infoData = '';
        for await (const chunk of infoProcess.stdout) {
            infoData += chunk;
        }
        
        if (!infoData) {
             throw new Error('Failed to get video info');
        }

        const info = JSON.parse(infoData);
        
        const sanitizedTitle = info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `yt_${Date.now()}_${sanitizedTitle}.mp3`;

        // 2. Stream Download -> Buffer -> Supabase
        const downloadProcess = spawn('yt-dlp', ['-f', 'bestaudio', '-o', '-', url]);
        const chunks: Uint8Array[] = [];
        
        for await (const chunk of downloadProcess.stdout) {
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
