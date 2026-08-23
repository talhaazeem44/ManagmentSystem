import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, Customer, DeliveryOrder } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

const CUSTOMER_EDITABLE_FIELDS = ['name', 'fatherName', 'careOf', 'mobile', 'address', 'cnic'] as const;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const sale = await Sale.findById(id).lean();

        if (!sale) {
            return NextResponse.json(
                { message: 'Sale not found' },
                { status: 404 }
            );
        }

        const bike = await Bike.findById(sale.bikeId).lean();
        const customer = await Customer.findById(sale.customerId).lean();
        const deliveryOrder = bike ? await DeliveryOrder.findById(bike.deliveryOrderId).lean() : null;

        return NextResponse.json({
            ...sale,
            id: sale._id.toString(),
            bike: bike ? { ...bike, deliveryOrder } : null,
            customer
        });
    } catch (error: any) {
        console.error('Error fetching sale:', error);
        return NextResponse.json(
            { message: 'Failed to fetch sale', error: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const { customer: customerUpdate, ...body } = await request.json();

        // Customer details (name, father's name, care of, mobile, address, cnic) live on
        // the shared Customer document, not the Sale — correct them there so the fix is
        // reflected everywhere that customer appears, not just this one sale.
        if (customerUpdate && typeof customerUpdate === 'object') {
            const customerFields: any = {};
            for (const f of CUSTOMER_EDITABLE_FIELDS) {
                if (customerUpdate[f] !== undefined) customerFields[f] = customerUpdate[f];
            }
            if (Object.keys(customerFields).length > 0) {
                const saleForCustomer = await Sale.findById(id).select('customerId').lean();
                if (!saleForCustomer) return NextResponse.json({ message: 'Sale not found' }, { status: 404 });
                try {
                    await Customer.findByIdAndUpdate(saleForCustomer.customerId, { $set: customerFields }, { runValidators: true });
                } catch (err: any) {
                    if (err.code === 11000) {
                        return NextResponse.json({ message: 'Another customer already uses that CNIC' }, { status: 400 });
                    }
                    throw err;
                }
            }
        }

        // Special handler: delete a payment by index and reverse its effect
        if (body.removePaymentIndex !== undefined) {
            const idx = Number(body.removePaymentIndex);
            const existing = await Sale.findById(id);
            if (!existing) return NextResponse.json({ message: 'Sale not found' }, { status: 404 });
            const payments = [...(existing.payments || [])];
            if (idx < 0 || idx >= payments.length) {
                return NextResponse.json({ message: 'Invalid payment index' }, { status: 400 });
            }
            const removedAmount = Number(payments[idx].amount || 0);
            const removedMode = payments[idx].paymentMode === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH';
            payments.splice(idx, 1);
            const set: any = {
                payments,
                balance: Number(existing.balance || 0) + removedAmount,
            };
            if (removedMode === 'BANK_TRANSFER') {
                set.bankTransferAmount = Math.max(0, Number(existing.bankTransferAmount || 0) - removedAmount);
            } else {
                set.receivedCash = Math.max(0, Number(existing.receivedCash || 0) - removedAmount);
            }
            const sale = await Sale.findByIdAndUpdate(id, { $set: set }, { new: true });
            return NextResponse.json(sale);
        }

        // Special handler: record a payment against a credit sale
        if (body.addPayment) {
            const { amount, date, note, paymentMode } = body.addPayment;
            const mode: 'CASH' | 'BANK_TRANSFER' = paymentMode === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH';
            const paymentAmount = Number(amount);
            const existing = await Sale.findById(id);
            if (!existing) return NextResponse.json({ message: 'Sale not found' }, { status: 404 });

            const newBalance = Math.max(0, Number(existing.balance ?? 0) - paymentAmount);
            // Route the amount to receivedCash or bankTransferAmount based on how it actually came in,
            // so cash-in-hand only ever reflects physical cash, never bank transfers.
            const incField = mode === 'BANK_TRANSFER' ? 'bankTransferAmount' : 'receivedCash';
            const sale = await Sale.findByIdAndUpdate(
                id,
                {
                    $push: { payments: { amount: paymentAmount, date: resolveTransactionDate(date), note: note || '', paymentMode: mode } },
                    $inc: { [incField]: paymentAmount },
                    $set: { balance: newBalance },
                },
                { new: true }
            );
            return NextResponse.json(sale);
        }

        // Generic edit (e.g. the inline edit on the Sales list page). Reports/Dashboard
        // scope "cash in hand" by the sale's original saleDate — so directly overwriting
        // receivedCash/bankTransferAmount on an older sale silently attributes the extra
        // cash to that old date instead of today, and it never shows up in the current
        // cash-in-hand window. If either amount increased, record the delta as a dated
        // payment (today) — the same mechanism credit-payment recording already uses —
        // so Reports' cross-boundary payment logic picks it up correctly regardless of
        // how old the sale is. Decreases (corrections) don't get a payment entry since
        // there's no new cash to attribute.
        const existingForDelta = (body.receivedCash !== undefined || body.bankTransferAmount !== undefined)
            ? await Sale.findById(id)
            : null;
        const updateOps: any = { $set: body };
        if (existingForDelta) {
            const paymentEntries: any[] = [];
            if (body.receivedCash !== undefined) {
                const delta = Number(body.receivedCash) - Number(existingForDelta.receivedCash || 0);
                if (delta > 0) paymentEntries.push({ amount: delta, date: new Date(), note: 'Edited on Sales page', paymentMode: 'CASH' });
            }
            if (body.bankTransferAmount !== undefined) {
                const delta = Number(body.bankTransferAmount) - Number(existingForDelta.bankTransferAmount || 0);
                if (delta > 0) paymentEntries.push({ amount: delta, date: new Date(), note: 'Edited on Sales page', paymentMode: 'BANK_TRANSFER' });
            }
            if (paymentEntries.length > 0) {
                updateOps.$push = { payments: { $each: paymentEntries } };
            }
        }

        const sale = await Sale.findByIdAndUpdate(
            id,
            updateOps,
            { new: true, runValidators: true }
        );

        if (!sale) {
            return NextResponse.json(
                { message: 'Sale not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(sale);
    } catch (error: any) {
        console.error('Error updating sale:', error);
        return NextResponse.json(
            { message: 'Failed to update sale', error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const sale = await Sale.findById(id);
        if (!sale) {
            return NextResponse.json(
                { message: 'Sale not found' },
                { status: 404 }
            );
        }

        // Revert bike status
        await Bike.findByIdAndUpdate(sale.bikeId, { status: 'AVAILABLE' });

        await Sale.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Sale deleted successfully, bike status reverted to AVAILABLE' });
    } catch (error: any) {
        console.error('Error deleting sale:', error);
        return NextResponse.json(
            { message: 'Failed to delete sale', error: error.message },
            { status: 500 }
        );
    }
}
