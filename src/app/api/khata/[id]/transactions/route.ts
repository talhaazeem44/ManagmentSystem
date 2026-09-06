import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty, Bike } from '@/models';
import { getKhataMargin } from '@/lib/constants';
import { resolveTransactionDate } from '@/lib/dates';

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

    // Exchange return: a bike from inventory given back to a party as repayment.
    // margin is explicitly 0 — profit was already captured on the original sale of the borrowed bike.
    if (body.type === 'EXCHANGE_RETURN') {
        if (!body.bikeId) return NextResponse.json({ message: 'bikeId required for exchange return' }, { status: 400 });
        const bike = await Bike.findById(body.bikeId).lean() as any;
        if (!bike) return NextResponse.json({ message: 'Bike not found' }, { status: 404 });
        if (bike.status !== 'AVAILABLE') return NextResponse.json({ message: `Bike ${bike.engineNumber} is not available (status: ${bike.status})` }, { status: 409 });

        amount = Number(body.amount) || 0; // optional — defaults to 0 (record-only exchange)
        margin = 0; // never count margin on a return
        description = body.description?.trim() || `Exchange Return — ${bike.model} (${bike.engineNumber})`;
        items = [{
            model: bike.model,
            quantity: 1,
            pricePerUnit: amount,
            standardPrice: amount,
            baseMargin: 0,
            totalMargin: 0,
            bikeId: bike._id.toString(),
            engineNumber: bike.engineNumber,
            chassisNumber: bike.chassisNumber,
        }];
    }

    // Allow amount=0 for exchange returns (record-only, no financial value agreed)
    if (!amount && body.type !== 'EXCHANGE_RETURN') return NextResponse.json({ message: 'amount required' }, { status: 400 });
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

    // STOCK_GIVEN: mark linked inventory bikes as SOLD
    const soldBikeIds = body.type === 'STOCK_GIVEN' ? items.map((i: any) => i.bikeId).filter(Boolean) : [];
    if (soldBikeIds.length > 0) {
        await Bike.updateMany({ _id: { $in: soldBikeIds } }, { $set: { status: 'SOLD' } });
    }
    // EXCHANGE_RETURN: mark the returned bike as EXCHANGED (not SOLD — no double-margin)
    if (body.type === 'EXCHANGE_RETURN' && body.bikeId) {
        await Bike.findByIdAndUpdate(body.bikeId, { $set: { status: 'EXCHANGED' } });
    }

    return NextResponse.json({ success: true });
}
