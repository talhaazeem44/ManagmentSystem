import { NextRequest, NextResponse } from 'next/server';
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
