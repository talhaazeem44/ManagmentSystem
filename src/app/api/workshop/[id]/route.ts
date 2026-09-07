import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ServiceSale, WorkshopStock } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();
        const { addPayment, removePaymentIndex, editCredit, editBill } = body;

        // ── Full bill edit: update items, service charges, customer fields ──────
        if (editBill) {
            const existing = await ServiceSale.findById(id);
            if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

            const items = (editBill.items || []).map((item: any) => {
                if (!item.stockId) { const { stockId, ...rest } = item; return rest; }
                return item;
            });
            const serviceCharges = Number(editBill.serviceCharges) || 0;
            const itemsTotal = items.reduce((s: number, i: any) => s + i.customerPrice * i.quantity, 0);
            const totalCost   = items.reduce((s: number, i: any) => s + i.retailPrice  * i.quantity, 0);
            const totalAmount = serviceCharges + itemsTotal;
            const margin      = totalAmount - totalCost;

            // Recalculate balance: keep existing payments, subtract from new total
            const totalPaid = (existing.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
            const balance = existing.paymentMode === 'CREDIT' ? Math.max(0, totalAmount - totalPaid) : 0;

            // Diff stock: restore old items qty, deduct new items qty
            const oldItems: any[] = existing.items || [];
            for (const old of oldItems) {
                if (old.stockId) {
                    await WorkshopStock.findByIdAndUpdate(old.stockId, { $inc: { quantity: old.quantity } });
                }
            }
            for (const item of items) {
                if (item.stockId) {
                    await WorkshopStock.findByIdAndUpdate(item.stockId, { $inc: { quantity: -item.quantity } });
                }
            }

            const updated = await ServiceSale.findByIdAndUpdate(id, {
                $set: {
                    customerName:   editBill.customerName   ?? existing.customerName,
                    customerMobile: editBill.customerMobile ?? existing.customerMobile,
                    bikeNumber:     editBill.bikeNumber     ?? existing.bikeNumber,
                    mechanicName:   editBill.mechanicName   ?? existing.mechanicName,
                    serviceType:    editBill.serviceType    ?? existing.serviceType,
                    description:    editBill.description    ?? existing.description,
                    serviceCharges, items, totalAmount, totalCost, margin, balance,
                },
            }, { new: true });
            return NextResponse.json(updated);
        }


        // Direct correction of a credit bill's amounts (e.g. a discount was agreed after
        // billing, or the wrong total/balance was recorded) — sets totalAmount and balance
        // straight, without touching items/margin or going through the payments trail.
        if (editCredit) {
            const totalAmount = Number(editCredit.totalAmount);
            const balance = Number(editCredit.balance);
            if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isFinite(balance) || balance < 0) {
                return NextResponse.json({ message: 'Enter valid amounts' }, { status: 400 });
            }
            const service = await ServiceSale.findByIdAndUpdate(
                id,
                { $set: { totalAmount, balance: Math.min(balance, totalAmount) } },
                { new: true }
            );
            if (!service) return NextResponse.json({ message: 'Not found' }, { status: 404 });
            return NextResponse.json(service);
        }

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
