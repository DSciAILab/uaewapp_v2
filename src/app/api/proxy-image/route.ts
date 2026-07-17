import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Este proxy fazia fetch(url) sem validação nenhuma: read-SSRF completo
// (metadata endpoints da cloud, RFC1918, localhost) com ACAO:* devolvendo o
// corpo pro browser. O único host que o app realmente monta é o appadmin
// (ver getFighterPhotoUrl em src/lib/utils.ts) — então o proxy é travado nele.
const ALLOWED_IMAGE_HOST = 'appadmin.uaewarriors.com';

export async function GET(request: NextRequest) {
  // Defense-in-depth: a rota já é auth-gated pelo middleware (não está na
  // allowlist pública), mas o handler não deve depender só disso.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  if (target.protocol !== 'https:' || target.hostname.toLowerCase() !== ALLOWED_IMAGE_HOST) {
    return new NextResponse('Forbidden host', { status: 403 });
  }

  try {
    const response = await fetch(target.toString(), { redirect: 'error' });
    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    // Sem isto o proxy reflete qualquer corpo (HTML/JSON) como se fosse imagem.
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 415 });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // Conteúdo por-usuário atrás de auth: cache privado, e sem ACAO:*
        // (as <img> do app são same-origin, não precisam de CORS).
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
