import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ServiceSale } from '@/models';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        await ServiceSale.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
    }
}
