import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ServiceSale } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const { addPayment, removePaymentIndex } = await request.json();

        if (addPayment) {
            const { amount, date, note, paymentMode } = addPayment;
            const mode: 'CASH' | 'BANK_TRANSFER' = paymentMode === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH';
            const paymentAmount = Number(amount);
            const existing = await ServiceSale.findById(id);
            if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

            const newBalance = Math.max(0, Number(existing.balance ?? 0) - paymentAmount);
            const service = await ServiceSale.findByIdAndUpdate(
                id,
                {
                    $push: { payments: { amount: paymentAmount, date: resolveTransactionDate(date), note: note || '', paymentMode: mode } },
                    $set: { balance: newBalance },
                },
                { new: true }
            );
            return NextResponse.json(service);
        }

        if (removePaymentIndex !== undefined) {
            const idx = Number(removePaymentIndex);
            const existing = await ServiceSale.findById(id);
            if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });
            const payments = [...(existing.payments || [])];
            if (idx < 0 || idx >= payments.length) {
                return NextResponse.json({ message: 'Invalid payment index' }, { status: 400 });
            }
            const removedAmount = Number(payments[idx].amount || 0);
            payments.splice(idx, 1);
            const service = await ServiceSale.findByIdAndUpdate(
                id,
                { $set: { payments, balance: Number(existing.balance || 0) + removedAmount } },
                { new: true }
            );
            return NextResponse.json(service);
        }

        return NextResponse.json({ message: 'Nothing to update' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

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
