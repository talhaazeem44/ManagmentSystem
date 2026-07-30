import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty } from '@/models';
import { BIKE_UNIT_MARGINS, getKhataReferencePrice } from '@/lib/constants';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; txId: string }> }) {
    await dbConnect();
    const { id, txId } = await params;
    const party = await KhataParty.findByIdAndUpdate(
        id,
        { $pull: { transactions: { _id: txId } } },
        { new: true }
    );
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; txId: string }> }) {
    await dbConnect();
    const { id, txId } = await params;
    const body = await req.json();

    let update: Record<string, any> = {};

    if (body.type === 'PAYMENT') {
        const amount = Number(body.amount || 0);
        if (!amount) return NextResponse.json({ message: 'amount required' }, { status: 400 });
        update = {
            'transactions.$.amount': amount,
            'transactions.$.paymentMode': body.paymentMode || 'CASH',
            'transactions.$.note': body.note?.trim() || '',
            'transactions.$.date': body.date ? new Date(body.date) : new Date(),
            'transactions.$.description': 'Payment received',
        };
    } else if (body.type === 'STOCK_GIVEN') {
        const items = (body.items || [])
            .filter((item: any) => item.model && Number(item.quantity) > 0 && Number(item.pricePerUnit) > 0)
            .map((item: any) => {
                const model = item.model;
                const quantity = Number(item.quantity);
                const pricePerUnit = Number(item.pricePerUnit);
                const standardPrice = getKhataReferencePrice(model);
                const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
                const extra = pricePerUnit - standardPrice;
                const totalMargin = quantity * (baseMargin + extra);
                return { model, quantity, pricePerUnit, standardPrice, baseMargin, totalMargin };
            });
        if (items.length === 0) return NextResponse.json({ message: 'No valid bike items' }, { status: 400 });
        const amount = items.reduce((s: number, i: any) => s + i.quantity * i.pricePerUnit, 0) + (Number(body.otherAmount) || 0);
        const margin = items.reduce((s: number, i: any) => s + i.totalMargin, 0);
        const description = items.map((i: any) => `${i.quantity}x ${i.model}`).join(' + ');
        update = {
            'transactions.$.amount': amount,
            'transactions.$.margin': margin,
            'transactions.$.description': description,
            'transactions.$.items': items,
            'transactions.$.date': body.date ? new Date(body.date) : new Date(),
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
    return NextResponse.json({ success: true });
}
