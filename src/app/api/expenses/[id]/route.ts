import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import { Expense } from '@/models';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;

        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (token?.role === 'workshop') {
            const existing = await Expense.findById(id).lean();
            if (existing && (existing as any).deductFrom !== 'WORKSHOP') {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
            }
        }

        const result = await Expense.findByIdAndDelete(id);
        if (!result) return NextResponse.json({ message: 'Not found' }, { status: 404 });
        return NextResponse.json({ message: 'Deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
