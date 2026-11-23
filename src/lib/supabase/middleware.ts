import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Pages for signing in. Logged-in users are sent to the dashboard from here.
const AUTH_ROUTES = ['/login', '/forgot-password'];

// Pages anyone may open, logged in or not. Nothing is redirected here.
// - /reset-password: the email link must work even if a session cookie exists
// - /offline: precached by the service worker for every visitor
// - /shop-suspended, /unauthorized: shown to users who cannot use the app
const OPEN_ROUTES = ['/reset-password', '/privacy', '/terms', '/offline', '/shop-suspended', '/unauthorized'];

// Files that must never be redirected to /login (PWA would break for logged-out visitors)
const OPEN_FILES = ['/manifest.json', '/sw.js', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/api/version'];

function matches(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { pathname } = request.nextUrl;

  if (OPEN_FILES.includes(pathname) || matches(pathname, OPEN_ROUTES)) {
    return supabaseResponse;
  }

  const isAuthRoute = matches(pathname, AUTH_ROUTES);

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && /-auth-token(\.\d+)?$/.test(c.name));

  // 1. Fast path: no session cookie on a protected route -> login (no network call)
  if (!hasAuthCookie && !isAuthRoute) {
    return redirectToLogin(request, pathname);
  }
  if (!hasAuthCookie && isAuthRoute) {
    return supabaseResponse;
  }

  // 2. Fast path: client-side RSC navigation. Server components (getAuthUser)
  //    perform the authoritative check, so skip the duplicate network round trip.
  const isRscRequest = request.headers.get('rsc') === '1' || request.nextUrl.searchParams.has('_rsc');
  if (isRscRequest) {
    return supabaseResponse;
  }

  // 3. Full document request: refresh token & verify session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  let timedOut = false;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase auth check timed out')), 3500)
      ),
    ]);
    user = result?.data?.user ?? null;
  } catch (error) {
    // Slow internet on the auth server must not log the shopkeeper out.
    // Let the request through; server components re-check the session.
    console.warn('Middleware auth check skipped:', error);
    timedOut = true;
  }

  if (timedOut) {
    return supabaseResponse;
  }

  if (!user && !isAuthRoute) {
    return redirectToLogin(request, pathname);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  if (pathname !== '/' && pathname !== '/login') {
    url.searchParams.set('redirect', pathname);
  }
  return NextResponse.redirect(url);
}
