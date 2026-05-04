import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CashCollection } from '@/models';

export async function GET() {
    try {
        await dbConnect();
        const last = await CashCollection.findOne().sort({ collectedAt: -1 }).lean();
        return NextResponse.json({ last: last || null });
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
