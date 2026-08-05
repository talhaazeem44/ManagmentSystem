import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { UsedBike, Expense } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const filter: any = {};
        if (status) filter.status = status;

        const usedBikes = await UsedBike.find(filter).sort({ createdAt: -1 }).lean();
        return NextResponse.json(usedBikes);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const {
            model, color, engineNumber, chassisNumber,
            sourceName, sourceMobile,
            purchasePrice, purchaseDate, purchaseDeductFrom, notes,
        } = await request.json();

        if (!model || !purchasePrice || !purchaseDeductFrom) {
            return NextResponse.json({ message: 'Model, purchase price, and deduct-from are required' }, { status: 400 });
        }
        if (!['CASH', 'MARGIN'].includes(purchaseDeductFrom)) {
            return NextResponse.json({ message: 'purchaseDeductFrom must be CASH or MARGIN' }, { status: 400 });
        }

        const date = purchaseDate ? new Date(purchaseDate) : new Date();

        // Reuse the existing Expense system for the cash/margin deduction — same mechanics as any
        // other expense, just categorized so it's identifiable in the expense breakdown.
        const expense = await Expense.create({
            amount: Number(purchasePrice),
            description: `Used bike buyback — ${model}${sourceName ? ` from ${sourceName}` : ''}`,
            category: 'Used Bike Purchase',
            deductFrom: purchaseDeductFrom,
            date,
        });

        const usedBike = await UsedBike.create({
            model, color, engineNumber, chassisNumber,
            sourceName, sourceMobile,
            purchasePrice: Number(purchasePrice),
            purchaseDate: date,
            purchaseDeductFrom,
            purchaseExpenseId: expense._id,
            status: 'IN_STOCK',
            notes,
        });

        return NextResponse.json(usedBike, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
