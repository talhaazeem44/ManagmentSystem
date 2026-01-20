import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const isLoginPage = request.nextUrl.pathname === '/login';
    const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

    // Allow API auth routes
    if (isApiAuth) {
        return NextResponse.next();
    }

    // Redirect to dashboard if already logged in and trying to access login
    if (isLoginPage && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirect to login if not authenticated and trying to access protected routes
    if (!isLoginPage && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
