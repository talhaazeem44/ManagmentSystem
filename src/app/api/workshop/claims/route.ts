import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WarrantyClaim, WorkshopStock } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const claims = await WarrantyClaim.find().sort({ claimDate: -1 }).lean();
        return NextResponse.json(claims);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { stockId, itemName, productCode, quantity, reason, customerName, bikeNumber, claimDate, notes } = body;

        if (!itemName || !quantity || Number(quantity) <= 0) {
            return NextResponse.json({ message: 'Item and quantity are required' }, { status: 400 });
        }

        const qty = Number(quantity);

        // The part physically leaves the shop the moment it's sent for claim — take it out of
        // sellable stock now, not when the claim is eventually resolved.
        if (stockId) {
            await WorkshopStock.findByIdAndUpdate(stockId, { $inc: { quantity: -qty } });
        }

        const claim = await WarrantyClaim.create({
            stockId: stockId || undefined,
            itemName,
            productCode,
            quantity: qty,
            reason,
            customerName,
            bikeNumber,
            claimDate: resolveTransactionDate(claimDate),
            notes,
            status: 'PENDING',
        });

        return NextResponse.json(claim, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
