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

        const counter = await Counter.findById(id);
        const nextSeq = counter ? counter.seq + 1 : 1;

        return NextResponse.json({ next: nextSeq });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch counter', error: error.message }, { status: 500 });
    }
}
