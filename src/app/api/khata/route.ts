import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty } from '@/models';

export async function GET() {
    await dbConnect();
    const parties = await KhataParty.find({}).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(parties.map(p => {
        const totalDebit = p.transactions.filter((t: any) => t.type === 'STOCK_GIVEN').reduce((s: number, t: any) => s + t.amount, 0);
        const totalCredit = p.transactions.filter((t: any) => t.type === 'PAYMENT').reduce((s: number, t: any) => s + t.amount, 0);
        return {
            _id: p._id,
            name: p.name,
            mobile: p.mobile,
            address: p.address,
            notes: p.notes,
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit,
            transactionCount: p.transactions.length,
            lastActivity: p.updatedAt,
        };
    }));
}

export async function POST(req: NextRequest) {
    await dbConnect();
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ message: 'Name required' }, { status: 400 });
    const party = await KhataParty.create({
        name: body.name.trim(),
        mobile: body.mobile?.trim() || undefined,
        address: body.address?.trim() || undefined,
        notes: body.notes?.trim() || undefined,
    });
    return NextResponse.json(party, { status: 201 });
}
