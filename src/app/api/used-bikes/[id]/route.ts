import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { UsedBike, Expense } from '@/models';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const existing = await UsedBike.findById(id);
        if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        // Recording the resale
        if (body.sell) {
            const { soldPrice, soldDate, buyerName } = body.sell;
            if (!soldPrice || Number(soldPrice) <= 0) {
                return NextResponse.json({ message: 'A valid sold price is required' }, { status: 400 });
            }
            if (existing.status === 'SOLD') {
                return NextResponse.json({ message: 'Already sold' }, { status: 400 });
            }
            existing.soldPrice = Number(soldPrice);
            existing.soldDate = soldDate ? new Date(soldDate) : new Date();
            existing.buyerName = buyerName || undefined;
            existing.status = 'SOLD';
            await existing.save();
            return NextResponse.json(existing);
        }

        // Editing purchase-side details
        if (existing.status === 'SOLD') {
            return NextResponse.json({ message: 'Cannot edit purchase details after it has been sold' }, { status: 400 });
        }

        const update: any = {};
        for (const f of ['model', 'color', 'engineNumber', 'chassisNumber', 'sourceName', 'sourceMobile', 'notes']) {
            if (body[f] !== undefined) update[f] = body[f];
        }
        if (body.purchasePrice !== undefined) update.purchasePrice = Number(body.purchasePrice);
        if (body.purchaseDeductFrom !== undefined) update.purchaseDeductFrom = body.purchaseDeductFrom;
        if (body.purchaseDate !== undefined) update.purchaseDate = new Date(body.purchaseDate);

        // Keep the linked Expense record in sync so cash/margin figures don't drift from this record
        if (existing.purchaseExpenseId && (update.purchasePrice !== undefined || update.purchaseDeductFrom !== undefined || update.purchaseDate !== undefined)) {
            await Expense.findByIdAndUpdate(existing.purchaseExpenseId, {
                $set: {
                    ...(update.purchasePrice !== undefined ? { amount: update.purchasePrice } : {}),
                    ...(update.purchaseDeductFrom !== undefined ? { deductFrom: update.purchaseDeductFrom } : {}),
                    ...(update.purchaseDate !== undefined ? { date: update.purchaseDate } : {}),
                },
            });
        }

        const updated = await UsedBike.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const existing = await UsedBike.findById(id);
        if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        if (existing.status === 'SOLD') {
            return NextResponse.json(
                { message: 'Cannot delete — this bike has already been resold and is part of your margin history' },
                { status: 400 }
            );
        }

        if (existing.purchaseExpenseId) {
            await Expense.findByIdAndDelete(existing.purchaseExpenseId);
        }
        await UsedBike.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
