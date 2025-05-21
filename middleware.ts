import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check auth condition based on route
  const url = req.nextUrl.clone();
  const isAuthRoute = url.pathname.startsWith('/auth');
  const isApiRoute = url.pathname.startsWith('/api');
  const isProtectedRoute =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/clients') ||
    url.pathname.startsWith('/schedule') ||
    url.pathname.startsWith('/workouts') ||
    url.pathname.startsWith('/settings');

  // Redirect if user is not authenticated and trying to access protected routes
  if (!session && isProtectedRoute) {
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Redirect if user is authenticated and trying to access auth routes
  if (session && isAuthRoute && !url.pathname.startsWith('/auth/callback')) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Redirect if user is authenticated and trying to access the landing page (root path)
  if (session && url.pathname === '/') {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
