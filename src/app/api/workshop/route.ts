import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ServiceSale, WorkshopStock } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const paymentMode = searchParams.get('paymentMode');

        const filter: any = {};
        if (paymentMode) filter.paymentMode = paymentMode;

        const services = await ServiceSale.find(filter)
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
        // Manually-typed items (not picked from stock) have no real stockId — strip empty
        // strings so Mongoose doesn't try to cast "" to an ObjectId and fail validation.
        const items = (body.items || []).map((item: any) => {
            if (!item.stockId) {
                const { stockId, ...rest } = item;
                return rest;
            }
            return item;
        });

        // Calculate totals
        const itemsTotal = items.reduce((sum: number, item: any) => sum + item.customerPrice * item.quantity, 0);
        const totalCost = items.reduce((sum: number, item: any) => sum + item.retailPrice * item.quantity, 0);
        const totalAmount = serviceCharges + itemsTotal;
        const margin = totalAmount - totalCost; // service charges are pure profit

        // Credit jobs may collect a partial amount up front — whatever's left becomes the
        // pending balance tracked on the Workshop Credit page. Non-credit jobs are always
        // fully paid at billing time, so they carry no balance.
        const receivedNow = Number(body.receivedNow) || 0;
        const balance = body.paymentMode === 'CREDIT' ? Math.max(0, totalAmount - receivedNow) : 0;

        // Deduct stock quantities — manually-typed items (not picked from stock) have no
        // stockId, so there's nothing to deduct; passing an empty string to findByIdAndUpdate
        // throws a CastError and fails the whole save.
        for (const item of items) {
            if (!item.stockId) continue;
            await WorkshopStock.findByIdAndUpdate(item.stockId, {
                $inc: { quantity: -item.quantity }
            });
        }

        const { receivedNow: _omitReceivedNow, ...serviceBody } = body;
        const service = await ServiceSale.create({
            ...serviceBody,
            serviceCharges,
            items,
            totalAmount,
            totalCost,
            margin,
            balance,
        });

        return NextResponse.json(service, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
