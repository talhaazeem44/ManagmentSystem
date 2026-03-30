import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkshopStock } from '@/models';

export async function GET() {
    try {
        await dbConnect();
        const stock = await WorkshopStock.find().sort({ name: 1 }).lean();
        return NextResponse.json(stock);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const item = await WorkshopStock.create(body);
        return NextResponse.json(item, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
