import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty, Bike } from '@/models';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const party = await KhataParty.findById(id).lean();
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    // Populate missing colors for items linked to bikes
    const missingBikeIds = (party.transactions || [])
        .flatMap((t: any) => t.items || [])
        .filter((i: any) => i.bikeId && !i.color)
        .map((i: any) => i.bikeId);

    if (missingBikeIds.length > 0) {
        const bikes = await Bike.find({ _id: { $in: missingBikeIds } }, 'color').lean();
        const bikeColorMap = new Map(bikes.map((b: any) => [b._id.toString(), b.color]));
        for (const t of party.transactions || []) {
            for (const item of (t as any).items || []) {
                if (item.bikeId && !item.color && bikeColorMap.has(item.bikeId.toString())) {
                    item.color = bikeColorMap.get(item.bikeId.toString());
                }
            }
        }
    }

    const totalDebit = (party.transactions || []).filter((t: any) => t.type === 'STOCK_GIVEN' || t.type === 'REFUND').reduce((s: number, t: any) => s + t.amount, 0);
    const totalCredit = (party.transactions || []).filter((t: any) => t.type === 'PAYMENT').reduce((s: number, t: any) => s + t.amount, 0);
    const totalExchanged = (party.transactions || []).filter((t: any) => t.type === 'EXCHANGE_RETURN').reduce((s: number, t: any) => s + t.amount, 0);
    // outstanding = stock given minus cash payments only; exchange returns are inventory record, not financial settlement
    return NextResponse.json({ ...party, totalDebit, totalCredit, totalExchanged, balance: totalDebit - totalCredit });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const party = await KhataParty.findByIdAndUpdate(id, {
        $set: {
            ...(body.name && { name: body.name.trim() }),
            ...(body.mobile !== undefined && { mobile: body.mobile.trim() }),
            ...(body.address !== undefined && { address: body.address.trim() }),
            ...(body.notes !== undefined && { notes: body.notes.trim() }),
        }
    }, { new: true });
    if (!party) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(party);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    await KhataParty.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
}
