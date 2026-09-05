import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Secure cookies in production; not in dev, so localhost still works.
      cookieOptions: { secure: process.env.NODE_ENV === 'production' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  let user: { id: string } | null = null
  try {
    const res = await supabase.auth.getUser()
    user = res.data.user
  } catch {
    // If Supabase is unreachable (e.g. network/edge issues), fail open and
    // let the route handle auth itself rather than crashing the middleware
    // into a 404 for every request.
    user = null
  }

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')

  // Public marketing/legal pages that logged-out visitors may view.
  const isPublicPath = pathname === '/privacy'

  // Dev mode: allow a local dev cookie to stand in for a real session so the
  // email+OTP flow can be tested without an SMTP provider.
  const DEV_AUTH_COOKIE = 'cindel_dev_auth'
  const isDevAuth =
    process.env.NODE_ENV !== 'production' &&
    request.cookies.get(DEV_AUTH_COOKIE)?.value === '1'

  const isAuthenticated = !!user || isDevAuth

  // Anything outside the /auth/* flow (and public legal pages) requires an
  // authenticated user.
  if (!isAuthenticated && !isAuthRoute && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Signed-in users shouldn't see the login / sign-up screens.
  if (isAuthenticated && (pathname === '/auth/login' || pathname === '/auth/sign-up')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
