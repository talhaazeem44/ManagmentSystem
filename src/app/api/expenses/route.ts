import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import { Expense } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const filter: any = {};
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }

        // Workshop-role accounts can reach this endpoint (their own Tracker page depends on
        // it), but must never see shop-wide margin/cash expenses — only ones tagged WORKSHOP.
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (token?.role === 'workshop') filter.deductFrom = 'WORKSHOP';

        const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
        return NextResponse.json(expenses);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { amount, description, category, deductFrom, date } = await request.json();

        if (!amount || !description || !deductFrom) {
            return NextResponse.json({ message: 'Amount, description and deduct from are required' }, { status: 400 });
        }

        // Workshop-role accounts may only ever create WORKSHOP-tagged expenses, regardless
        // of what the client sends — keeps their Tracker page from touching shop-wide margin/cash.
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (token?.role === 'workshop' && deductFrom !== 'WORKSHOP') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const expense = await Expense.create({
            amount: Number(amount),
            description,
            category: category || 'Other',
            deductFrom,
            date: resolveTransactionDate(date),
        });

        return NextResponse.json(expense, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
