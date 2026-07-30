import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty } from '@/models';
import { BIKE_UNIT_MARGINS, getKhataReferencePrice } from '@/lib/constants';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    if (!body.type) return NextResponse.json({ message: 'type required' }, { status: 400 });

    let amount = Number(body.amount || 0);
    let margin = 0;
    let description = body.description?.trim() || '';
    let items: any[] = [];

    if (body.type === 'STOCK_GIVEN' && Array.isArray(body.items) && body.items.length > 0) {
        items = body.items
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

        if (items.length === 0)
            return NextResponse.json({ message: 'No valid bike items provided' }, { status: 400 });

        amount = items.reduce((s: number, i: any) => s + i.quantity * i.pricePerUnit, 0) + (Number(body.otherAmount) || 0);
        margin = items.reduce((s: number, i: any) => s + i.totalMargin, 0);
        if (!description)
            description = items.map((i: any) => `${i.quantity}x ${i.model}`).join(' + ');
    }

    if (!amount) return NextResponse.json({ message: 'amount required' }, { status: 400 });
    if (!description) return NextResponse.json({ message: 'description required' }, { status: 400 });

    const party = await KhataParty.findByIdAndUpdate(
        id,
        {
            $push: {
                transactions: {
                    type: body.type,
                    description,
                    amount,
                    margin: margin || 0,
                    items: items.length > 0 ? items : undefined,
                    paymentMode: body.paymentMode || undefined,
                    note: body.note?.trim() || undefined,
                    date: body.date ? new Date(body.date) : new Date(),
                }
            }
        },
        { new: true }
    );
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}
