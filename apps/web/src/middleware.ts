import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet: any[]) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser();

    // Protect admin routes
    const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard');
    if (isAdminRoute && !user) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Redirect logged-in users away from auth pages
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
    if (isAuthPage && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/dashboard/:path*', '/auth/:path*'],
};
