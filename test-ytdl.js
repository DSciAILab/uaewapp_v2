const ytdl = require('@distube/ytdl-core');
const fs = require('fs');

async function test() {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    console.log('Testing Info Fetch for:', url);
    
    try {
        const info = await ytdl.getInfo(url);
        console.log('Title:', info.videoDetails.title);
        
        console.log('Starting download stream test...');
        const stream = ytdl(url, { 
            filter: 'audioonly',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': process.env.YOUTUBE_COOKIE || '' // Allow testing cookie if env var set
                }
            }
        });
        
        stream.on('data', (chunk) => {
            console.log('Received chunk of size:', chunk.length);
            stream.destroy(); // Stop after one chunk
            console.log('Stream works!');
            process.exit(0);
        });
        
        stream.on('error', (err) => {
            console.error('Stream Error:', err);
            process.exit(1);
        });

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
}

test();
