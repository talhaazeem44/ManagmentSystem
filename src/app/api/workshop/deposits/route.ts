import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkshopDeposit } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const filter: any = {};
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const deposits = await WorkshopDeposit.find(filter).sort({ date: -1 }).lean();
        return NextResponse.json(deposits);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { amount, note, date } = await request.json();

        if (!amount || Number(amount) <= 0) {
            return NextResponse.json({ message: 'Amount is required' }, { status: 400 });
        }

        const deposit = await WorkshopDeposit.create({
            amount: Number(amount),
            note: note || '',
            date: date ? new Date(date) : new Date(),
        });

        return NextResponse.json(deposit, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });
        await WorkshopDeposit.findByIdAndDelete(id);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
