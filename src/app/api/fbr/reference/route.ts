import { NextRequest, NextResponse } from 'next/server';
import { FBR_URLS, reference } from '@/lib/fbr';

/**
 * GET /api/fbr/reference?key=provinces
 * Proxies FBR's lookup lists (provinces, uom, itemDescCode/HS codes, saleTypeToRate, …)
 * so the browser never sees the bearer token.
 */
export async function GET(request: NextRequest) {
    const key = new URL(request.url).searchParams.get('key') as keyof typeof FBR_URLS | null;
    if (!key || typeof FBR_URLS[key] !== 'string') {
        return NextResponse.json({
            message: 'Provide ?key= one of the reference endpoints',
            keys: Object.entries(FBR_URLS).filter(([, v]) => typeof v === 'string').map(([k]) => k),
        }, { status: 400 });
    }
    try {
        return NextResponse.json(await reference(key));
    } catch (error) {
        return NextResponse.json({ message: 'FBR reference lookup failed', error: error instanceof Error ? error.message : String(error) }, { status: 502 });
    }
}
