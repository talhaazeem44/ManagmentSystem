import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { KhataParty } from '@/models';

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
