import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = request.nextUrl;

    const isLoginPage = pathname === '/login';
    const isApiAuth = pathname.startsWith('/api/auth');
    const isScratchPage = pathname.startsWith('/scratch');
    const isAdminPage = pathname.startsWith('/admin');
    const isWorkshopPage = pathname.startsWith('/workshop');
    const isWorkshopApi = pathname.startsWith('/api/workshop');
    // The Workshop Tracker page (cash deposits/expenses) reads and writes through the
    // shared /api/expenses endpoint (scoped server-side to deductFrom: 'WORKSHOP' for
    // this role), not a /api/workshop/* route — so a workshop-role user needs it allowed
    // too, or their GET/POST/DELETE there gets redirected away and silently fails. This
    // must stay separate from isWorkshopApi since regular 'user' accounts also need
    // /api/expenses for their own (non-workshop) expense tracking.
    const isApiExpenses = pathname.startsWith('/api/expenses');
    // Mechanics and part-lookup are shared endpoints the Workshop page itself depends on
    // (not under /api/workshop/*), so a workshop-role user needs them allowed too — otherwise
    // every call gets redirected away and fails silently (wrong content-type, not an error).
    const isApiMechanics = pathname.startsWith('/api/mechanics');
    const isApiFetchPartDetails = pathname.startsWith('/api/fetch-part-details');
    const isApiSeedStock = pathname.startsWith('/api/seed-stock');
    const isSetup = pathname === '/setup' || pathname.startsWith('/api/setup');

    // /api/users is intentionally NOT bypassed here — it requires a logged-in superadmin. The
    // route itself re-verifies the superadmin role server-side (via getServerSession, not just
    // this JWT), since that's a stronger check than decoding the edge token alone.
    if (isApiAuth || isScratchPage || isApiSeedStock || isSetup) {
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

        // Workshop users can only access /workshop pages, /api/workshop, /api/expenses
        // (scoped server-side to their own WORKSHOP-tagged records), /api/mechanics, and
        // /api/fetch-part-details.
        if (role === 'workshop' && !isWorkshopPage && !isWorkshopApi && !isApiExpenses && !isApiMechanics && !isApiFetchPartDetails) {
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

        // Only the superadmin manages staff accounts — regular 'admin' runs day-to-day
        // business operations but can't create logins or change anyone's access.
        if (isAdminPage && role !== 'superadmin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // A 'user' account an admin has explicitly restricted (token.permissions set) can only
        // reach the main-nav pages listed there. Accounts with no permissions array at all keep
        // the original full-access behavior — this is opt-in per account, not a new default.
        if (role === 'user' && Array.isArray(token.permissions) && !isAdminPage) {
            const topSegment = pathname.split('/')[1] || 'dashboard';
            const isApiRoute = pathname.startsWith('/api/');
            if (!isApiRoute && topSegment !== '' && !(token.permissions as string[]).includes(topSegment)) {
                const firstAllowed = (token.permissions as string[])[0] || 'dashboard';
                return NextResponse.redirect(new URL(`/${firstAllowed}`, request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
