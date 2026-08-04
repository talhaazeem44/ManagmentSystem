import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty, Bike } from '@/models';
import { getKhataMargin } from '@/lib/constants';

// The date picker only sends a calendar date (no time), which JS parses as UTC midnight.
// If that resolves to today, use the real current timestamp instead — otherwise a same-day entry
// recorded after a cash deposit would appear to have happened *before* it (00:00 < deposit time),
// silently dropping it out of the "since last deposit" cash-in-hand window.
function resolveTransactionDate(dateStr?: string): Date {
    const now = new Date();
    if (!dateStr) return now;
    const picked = new Date(dateStr);
    const isToday = picked.getUTCFullYear() === now.getUTCFullYear()
        && picked.getUTCMonth() === now.getUTCMonth()
        && picked.getUTCDate() === now.getUTCDate();
    return isToday ? now : picked;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    if (!body.type) return NextResponse.json({ message: 'type required' }, { status: 400 });

    let amount = Number(body.amount || 0);
    let margin = 0;
    let description = body.description?.trim() || '';
    let items: any[] = [];

    // Items linked to a specific bike (engine/chassis picked from inventory) represent exactly one
    // physical unit each — quantity is forced to 1 so it can't silently overstate the units actually taken.
    if (body.type === 'STOCK_GIVEN' && Array.isArray(body.items) && body.items.length > 0) {
        items = body.items
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

        if (items.length === 0)
            return NextResponse.json({ message: 'No valid bike items provided' }, { status: 400 });

        // Validate every referenced bike is real and still available before committing anything
        const bikeIds = items.map((i: any) => i.bikeId).filter(Boolean);
        if (bikeIds.length > 0) {
            const foundBikes = await Bike.find({ _id: { $in: bikeIds } }).lean();
            const notAvailable = foundBikes.filter((b: any) => b.status !== 'AVAILABLE');
            if (foundBikes.length !== bikeIds.length) {
                return NextResponse.json({ message: 'One of the selected bikes no longer exists' }, { status: 409 });
            }
            if (notAvailable.length > 0) {
                return NextResponse.json({ message: `Bike ${notAvailable[0].engineNumber} is no longer available (already sold)` }, { status: 409 });
            }
        }

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
                    date: resolveTransactionDate(body.date),
                }
            }
        },
        { new: true }
    );
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const soldBikeIds = items.map((i: any) => i.bikeId).filter(Boolean);
    if (soldBikeIds.length > 0) {
        await Bike.updateMany({ _id: { $in: soldBikeIds } }, { $set: { status: 'SOLD' } });
    }

    return NextResponse.json({ success: true });
}
