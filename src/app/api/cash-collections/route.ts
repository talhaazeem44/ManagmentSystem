import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CashCollection } from '@/models';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const all = await CashCollection.find().sort({ collectedAt: 1 }).lean();
        const last = all.length ? all[all.length - 1] : null;
        return NextResponse.json({ last: last || null, all });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch', error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { amount, note } = await request.json();
        const record = await CashCollection.create({ amount, note, collectedAt: new Date() });
        return NextResponse.json(record, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to save', error: error.message }, { status: 500 });
    }
}
