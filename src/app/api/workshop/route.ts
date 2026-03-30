import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ServiceSale, WorkshopStock } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const services = await ServiceSale.find()
            .sort({ date: -1 })
            .limit(limit)
            .lean();

        return NextResponse.json(services);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();

        const serviceCharges = Number(body.serviceCharges) || 0;
        const items = body.items || [];

        // Calculate totals
        const itemsTotal = items.reduce((sum: number, item: any) => sum + item.customerPrice * item.quantity, 0);
        const totalCost = items.reduce((sum: number, item: any) => sum + item.retailPrice * item.quantity, 0);
        const totalAmount = serviceCharges + itemsTotal;
        const margin = totalAmount - totalCost; // service charges are pure profit

        // Deduct stock quantities
        for (const item of items) {
            await WorkshopStock.findByIdAndUpdate(item.stockId, {
                $inc: { quantity: -item.quantity }
            });
        }

        const service = await ServiceSale.create({
            ...body,
            serviceCharges,
            items,
            totalAmount,
            totalCost,
            margin,
        });

        return NextResponse.json(service, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
