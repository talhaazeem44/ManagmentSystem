import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { MonthlyPlan } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        if (!month) return NextResponse.json({ message: 'month is required' }, { status: 400 });
        const doc = await MonthlyPlan.findOne({ month }).lean();
        return NextResponse.json({ month, targets: (doc as any)?.targets ?? {} });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch', error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { month, targets } = await request.json();
        if (!month) return NextResponse.json({ message: 'month is required' }, { status: 400 });
        const doc = await MonthlyPlan.findOneAndUpdate(
            { month },
            { targets: targets ?? {} },
            { upsert: true, new: true }
        ).lean();
        return NextResponse.json(doc);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to save', error: error.message }, { status: 500 });
    }
}
