import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WarrantyClaim, WorkshopStock } from '@/models';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const { status, replacementReceived } = await request.json();

        const existing = await WarrantyClaim.findById(id);
        if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        const set: any = {};
        if (status === 'RESOLVED' && existing.status !== 'RESOLVED') {
            set.status = 'RESOLVED';
            set.resolvedDate = new Date();
            set.replacementReceived = !!replacementReceived;
            // A working replacement sent back by the supplier goes back into sellable stock.
            if (replacementReceived && existing.stockId) {
                await WorkshopStock.findByIdAndUpdate(existing.stockId, { $inc: { quantity: existing.quantity } });
            }
        } else if (status === 'PENDING' && existing.status !== 'PENDING') {
            // Reopening a resolved claim — reverse the stock credit if one was given.
            if (existing.replacementReceived && existing.stockId) {
                await WorkshopStock.findByIdAndUpdate(existing.stockId, { $inc: { quantity: -existing.quantity } });
            }
            set.status = 'PENDING';
            set.resolvedDate = undefined;
            set.replacementReceived = false;
        }

        const claim = await WarrantyClaim.findByIdAndUpdate(id, { $set: set }, { new: true });
        return NextResponse.json(claim);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const existing = await WarrantyClaim.findById(id);
        if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        // Deleting a claim record means it should never have been taken out of stock in the
        // first place — give the quantity back, unless it was already resolved with a
        // replacement (that stock credit was already applied separately).
        if (existing.stockId && !(existing.status === 'RESOLVED' && existing.replacementReceived)) {
            await WorkshopStock.findByIdAndUpdate(existing.stockId, { $inc: { quantity: existing.quantity } });
        }

        await WarrantyClaim.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Claim deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
