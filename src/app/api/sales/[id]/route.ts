import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, Customer, DeliveryOrder } from '@/models';

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
        const body = await request.json();

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
                    $push: { payments: { amount: paymentAmount, date: new Date(date), note: note || '', paymentMode: mode } },
                    $inc: { [incField]: paymentAmount },
                    $set: { balance: newBalance },
                },
                { new: true }
            );
            return NextResponse.json(sale);
        }

        const sale = await Sale.findByIdAndUpdate(
            id,
            { $set: body },
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
