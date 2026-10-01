import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { MarginCollection } from '@/models';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') === 'WORKSHOP' ? 'WORKSHOP' : 'BIKE';
        // Records saved before `type` existed are all bike-sales collections — treat a missing
        // field as BIKE so old history still counts there, same as it always has.
        const filter: any = type === 'WORKSHOP' ? { type: 'WORKSHOP' } : { $or: [{ type: 'BIKE' }, { type: { $exists: false } }] };
        const all = await MarginCollection.find(filter).sort({ collectedAt: -1 }).lean();
        const last = all.length ? all[0] : null;
        return NextResponse.json({ last: last || null, all });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch', error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { amount, note, type } = await request.json();
        const record = await MarginCollection.create({
            amount,
            note,
            collectedAt: new Date(),
            type: type === 'WORKSHOP' ? 'WORKSHOP' : 'BIKE',
        });
        return NextResponse.json(record, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to save', error: error.message }, { status: 500 });
    }
}
