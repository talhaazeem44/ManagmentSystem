import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkshopCashBalance } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const latest = await WorkshopCashBalance.findOne().sort({ asOfDate: -1 }).lean();
        return NextResponse.json({ latest: latest || null });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { cashAmount, bankAmount, asOfDate, note } = await request.json();

        const record = await WorkshopCashBalance.create({
            cashAmount: Number(cashAmount) || 0,
            bankAmount: Number(bankAmount) || 0,
            asOfDate: resolveTransactionDate(asOfDate),
            note,
        });

        return NextResponse.json(record, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
