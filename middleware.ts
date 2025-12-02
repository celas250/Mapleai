import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next();
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next();
          response.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app/* routes
  if (request.nextUrl.pathname.startsWith('/app') && !user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Redirect authenticated users away from /auth
  if (request.nextUrl.pathname === '/auth' && user) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/app/:path*', '/auth'],
};
