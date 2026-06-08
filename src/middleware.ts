import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = request.nextUrl;

    const isLoginPage = pathname === '/login';
    const isApiAuth = pathname.startsWith('/api/auth');
    const isApiUsers = pathname.startsWith('/api/users');
    const isScratchPage = pathname.startsWith('/scratch');
    const isWorkshopPage = pathname.startsWith('/workshop');
    const isWorkshopApi = pathname.startsWith('/api/workshop');

    const isApiSeedStock = pathname.startsWith('/api/seed-stock');

    const isSetup = pathname === '/setup' || pathname.startsWith('/api/setup');

    if (isApiAuth || isApiUsers || isScratchPage || isApiSeedStock || isSetup) {
        return NextResponse.next();
    }

    if (isLoginPage && token) {
        const role = token.role as string;
        const dest = role === 'workshop' ? '/workshop' : '/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
    }

    if (!isLoginPage && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token) {
        const role = token.role as string;

        // Workshop users can only access /workshop pages and /api/workshop
        if (role === 'workshop' && !isWorkshopPage && !isWorkshopApi) {
            return NextResponse.redirect(new URL('/workshop', request.url));
        }

        // Regular users cannot access workshop section
        if (role === 'user' && (isWorkshopPage || isWorkshopApi)) {
            if (isWorkshopApi) {
                return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
