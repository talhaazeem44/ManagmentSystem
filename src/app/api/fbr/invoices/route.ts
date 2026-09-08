import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { FbrInvoice } from '@/models';

/** GET /api/fbr/invoices?status=INVALID&sourceType=SALE&limit=100 */
export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const filter: Record<string, unknown> = {};
        for (const key of ['status', 'sourceType', 'mode'] as const) {
            const v = searchParams.get(key);
            if (v) filter[key] = v;
        }
        const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

        const invoices = await FbrInvoice.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('-payload -response')
            .lean();

        return NextResponse.json(invoices.map(i => ({ ...i, id: String(i._id) })));
    } catch (error) {
        return NextResponse.json({ message: 'Failed to fetch FBR invoices', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
