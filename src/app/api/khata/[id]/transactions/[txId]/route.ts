import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty, Bike } from '@/models';
import { getKhataMargin } from '@/lib/constants';
import { resolveTransactionDate } from '@/lib/dates';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; txId: string }> }) {
    await dbConnect();
    const { id, txId } = await params;

    const existingParty = await KhataParty.findById(id).lean();
    const existingTx = (existingParty as any)?.transactions?.find((t: any) => t._id.toString() === txId);
    const bikeIdsToRelease = (existingTx?.items || []).map((i: any) => i.bikeId).filter(Boolean);

    const party = await KhataParty.findByIdAndUpdate(
        id,
        { $pull: { transactions: { _id: txId } } },
        { new: true }
    );
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    if (bikeIdsToRelease.length > 0) {
        await Bike.updateMany({ _id: { $in: bikeIdsToRelease } }, { $set: { status: 'AVAILABLE' } });
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; txId: string }> }) {
    await dbConnect();
    const { id, txId } = await params;
    const body = await req.json();

    let update: Record<string, any> = {};
    let oldBikeIds: string[] = [];
    let newBikeIds: string[] = [];

    if (body.type === 'PAYMENT') {
        const amount = Number(body.amount || 0);
        if (!amount) return NextResponse.json({ message: 'amount required' }, { status: 400 });
        update = {
            'transactions.$.amount': amount,
            'transactions.$.paymentMode': body.paymentMode || 'CASH',
            'transactions.$.note': body.note?.trim() || '',
            'transactions.$.date': resolveTransactionDate(body.date),
            'transactions.$.description': 'Payment received',
        };
    } else if (body.type === 'STOCK_GIVEN') {
        const existingParty = await KhataParty.findById(id).lean();
        const existingTx = (existingParty as any)?.transactions?.find((t: any) => t._id.toString() === txId);
        oldBikeIds = (existingTx?.items || []).map((i: any) => i.bikeId?.toString()).filter(Boolean);

        const items = (body.items || [])
            .filter((item: any) => item.model && Number(item.quantity) > 0 && Number(item.pricePerUnit) > 0)
            .map((item: any) => {
                const model = item.model;
                const quantity = item.bikeId ? 1 : Number(item.quantity);
                const pricePerUnit = Number(item.pricePerUnit);
                const { referencePrice: standardPrice, baseMargin, margin: marginPerUnit } = getKhataMargin(model, pricePerUnit);
                const totalMargin = quantity * marginPerUnit;
                return {
                    model, quantity, pricePerUnit, standardPrice, baseMargin, totalMargin,
                    bikeId: item.bikeId || undefined,
                    engineNumber: item.engineNumber || undefined,
                    chassisNumber: item.chassisNumber || undefined,
                };
            });
        if (items.length === 0) return NextResponse.json({ message: 'No valid bike items' }, { status: 400 });

        newBikeIds = items.map((i: any) => i.bikeId).filter(Boolean);
        const newlyAddedBikeIds = newBikeIds.filter(bid => !oldBikeIds.includes(bid));
        if (newlyAddedBikeIds.length > 0) {
            const foundBikes = await Bike.find({ _id: { $in: newlyAddedBikeIds } }).lean();
            const notAvailable = foundBikes.filter((b: any) => b.status !== 'AVAILABLE');
            if (foundBikes.length !== newlyAddedBikeIds.length) {
                return NextResponse.json({ message: 'One of the selected bikes no longer exists' }, { status: 409 });
            }
            if (notAvailable.length > 0) {
                return NextResponse.json({ message: `Bike ${notAvailable[0].engineNumber} is no longer available (already sold)` }, { status: 409 });
            }
        }

        const amount = items.reduce((s: number, i: any) => s + i.quantity * i.pricePerUnit, 0) + (Number(body.otherAmount) || 0);
        const margin = items.reduce((s: number, i: any) => s + i.totalMargin, 0);
        const description = items.map((i: any) => `${i.quantity}x ${i.model}`).join(' + ');
        update = {
            'transactions.$.amount': amount,
            'transactions.$.margin': margin,
            'transactions.$.description': description,
            'transactions.$.items': items,
            'transactions.$.date': resolveTransactionDate(body.date),
            'transactions.$.note': body.note?.trim() || '',
        };
    } else {
        return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
    }

    const party = await KhataParty.findOneAndUpdate(
        { _id: id, 'transactions._id': txId },
        { $set: update },
        { new: true }
    );
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    // Release bikes that were removed from this transaction, and mark newly-added ones sold
    const releasedBikeIds = oldBikeIds.filter(bid => !newBikeIds.includes(bid));
    const soldBikeIds = newBikeIds.filter(bid => !oldBikeIds.includes(bid));
    if (releasedBikeIds.length > 0) {
        await Bike.updateMany({ _id: { $in: releasedBikeIds } }, { $set: { status: 'AVAILABLE' } });
    }
    if (soldBikeIds.length > 0) {
        await Bike.updateMany({ _id: { $in: soldBikeIds } }, { $set: { status: 'SOLD' } });
    }

    return NextResponse.json({ success: true });
}
