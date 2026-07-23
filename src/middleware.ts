import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas
  const pathname = request.nextUrl.pathname

  /*
   * Identity gate (UAE-20).
   *
   * A valid Supabase session is NOT proof of belonging here: this project's
   * auth.users is shared by every app on the same Supabase project, so it
   * holds accounts from unrelated apps and old test logins. Membership is
   * decided by OUR table — mma_users — and nothing else.
   *
   * Fails closed: if the lookup errors we deny, because the alternative is
   * reopening the door to every account on the project during a blip.
   *
   * NOTE: this read currently relies on mma_users being readable (RLS is
   * still USING(true) — F0 Bloco B). When real RLS lands, mma_users must keep
   * a policy that lets an authenticated user read their own row.
   */
  let isMember = false
  if (user?.email) {
    const { data: member, error: memberError } = await supabase
      .from('mma_users')
      .select('is_active, expires_at')
      .ilike('email', user.email)
      .maybeSingle()

    if (memberError) {
      console.error('[middleware] mma_users lookup failed:', memberError.message)
    } else if (member) {
      const notExpired = !member.expires_at || new Date(member.expires_at) > new Date()
      isMember = member.is_active === true && notExpired
    }
  }

  // Match exato: páginas públicas isoladas.
  // '/api/version' é público de propósito: só devolve o build id, e o
  // VersionWatcher roda em TODA página (inclusive /login e as públicas), então
  // precisa ser acessível sem sessão — senão o fetch cai em /login (HTML) e o
  // res.json() quebra, matando o auto-reload nessas telas.
  const PUBLIC_EXACT = ['/login', '/callback', '/', '/staging', '/api/version']
  // Match por prefixo: árvores públicas inteiras.
  // '/api/public' é obrigatório — sem ele o middleware redireciona POSTs
  // anônimos para /login (HTML), e o response.json() do submitter quebra.
  const PUBLIC_PREFIXES = ['/tv', '/public', '/api/public']

  const isPublicRoute =
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  // Não é membro (sem sessão, ou sessão de outro app) -> login.
  if (!isMember && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Signed in, but not a UAEW user: say so instead of looping silently.
    if (user) url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  // Só MEMBRO é mandado do /login pro dashboard. Usar `user` aqui mandaria o
  // não-membro pro dashboard, que o devolve pro /login -> loop infinito.
  if (isMember && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
