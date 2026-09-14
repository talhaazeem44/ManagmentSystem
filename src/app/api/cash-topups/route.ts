import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CashTopUp } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const filter: Record<string, unknown> = {};
        if (startDate || endDate) {
            const dateFilter: Record<string, Date> = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lt = new Date(endDate);
            filter.date = dateFilter;
        }

        const topUps = await CashTopUp.find(filter).sort({ date: -1 }).lean();
        return NextResponse.json({ topUps });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch', error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { amount, note, date } = await request.json();
        if (!amount || Number(amount) <= 0) {
            return NextResponse.json({ message: 'Amount must be greater than zero' }, { status: 400 });
        }
        const record = await CashTopUp.create({ amount: Number(amount), note, date: date ? new Date(date) : new Date() });
        return NextResponse.json(record, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to save', error: error.message }, { status: 500 });
    }
}
