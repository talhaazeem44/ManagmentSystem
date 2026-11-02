import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Counter } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'Counter id required' }, { status: 400 });
        }

        // saleReceipt numbers reset every month and look like "S-2611001" (year 26, month 11,
        // 1st sale that month) — mirror that same per-month counter key here so the preview
        // shown before submitting matches what actually gets saved.
        let next: string | number;
        if (id === 'saleReceipt') {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const counter = await Counter.findById(`saleReceipt-${yy}${mm}`);
            const nextSeq = counter ? counter.seq + 1 : 1;
            next = `S-${yy}${mm}${String(nextSeq).padStart(3, '0')}`;
        } else {
            const counter = await Counter.findById(id);
            next = counter ? counter.seq + 1 : 1;
        }

        return NextResponse.json({ next });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch counter', error: error.message }, { status: 500 });
    }
}
