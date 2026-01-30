
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
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
        return new Promise((resolve) => {
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
        
        // We need to fetch title first for filename (optional but nice)
        // Or we can just stream it. Let's just stream to be fast.
        // We'll use a generic filename or try to get it?
        // Let's use a generic one for speed, or `yt-dlp` can handle it? 
        // We set Content-Disposition in Next.js response.
        
        // -x: Extract audio
        // --audio-format mp3: Convert to mp3
        // -o -: Output to stdout
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
                    // We wait for process to close to ensure we don't close prematurely if using exit code check?
                    // Actually 'end' on stdout means no more data. 
                    // But legitimate failure might yield empty stdout.
                });

                ytProcess.stderr.on('data', (data) => {
                    console.log(`yt-dlp stderr: ${data}`); // Log progress/errors
                });

                ytProcess.on('close', (code) => {
                    if (code !== 0) {
                         console.error(`yt-dlp exited with code ${code}`);
                         // If we haven't closed yet, maybe error? 
                         // But if we already sent data, we can't really "error" the HTTP response easily mid-stream 
                         // without breaking the chunk encoding or just closing connection.
                         // controller.error(new Error(`Exit code ${code}`));
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
        });
    }

    // ACTION: UPLOAD (To Supabase) - REFACTORED FOR YT-DLP
    
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
    const info = JSON.parse(infoData);
    
    const sanitizedTitle = info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `yt_${Date.now()}_${sanitizedTitle}.mp3`;

    // 2. Stream Download -> Buffer -> Supabase
    // Note: Supabase Node client needs Buffer/Blob. 
    // Ideally we stream upload, but Supabase-js `upload` takes a Body.
    // We can buffer it (memory intensive) or use specialized stream uploader.
    // For now, let's buffer (Music is usually < 10MB).
    
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

  } catch (error: any) {
    console.error('YouTube processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
}
