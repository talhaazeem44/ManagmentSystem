import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdvanceSalary } from '@/models';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const staffName = searchParams.get('staffName');
    const recovered = searchParams.get('recovered'); // 'true' | 'false' | null = all

    const filter: Record<string, any> = {};
    if (staffName) filter.staffName = new RegExp(staffName, 'i');
    if (recovered === 'true') filter.recovered = true;
    else if (recovered === 'false') filter.recovered = false;

    const records = await AdvanceSalary.find(filter).sort({ date: -1 }).lean();
    return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
    await dbConnect();
    const body = await req.json();
    const { staffName, amount, deductFrom, note, date } = body;

    if (!staffName?.trim()) return NextResponse.json({ message: 'Staff name required' }, { status: 400 });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
        return NextResponse.json({ message: 'Valid amount required' }, { status: 400 });
    if (!['CASH', 'MARGIN'].includes(deductFrom))
        return NextResponse.json({ message: 'deductFrom must be CASH or MARGIN' }, { status: 400 });

    const record = await AdvanceSalary.create({
        staffName: staffName.trim(),
        amount: Number(amount),
        deductFrom,
        note: note?.trim() || undefined,
        date: date ? new Date(date) : new Date(),
        recovered: false,
    });

    return NextResponse.json(record, { status: 201 });
}
