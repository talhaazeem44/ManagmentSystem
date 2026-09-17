import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdvanceBooking, Bike } from '@/models';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const booking = await AdvanceBooking.findById(id).lean();
        if (!booking) return NextResponse.json({ message: 'Not found' }, { status: 404 });
        return NextResponse.json(booking);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const { deliveryPayment, ...body } = await request.json();

        // Linking an inventory bike at delivery time — mark it SOLD so it's no
        // longer available elsewhere, without needing a separate Sale record.
        if (body.bikeId) {
            await Bike.findByIdAndUpdate(body.bikeId, { status: 'SOLD' });
        }

        // Record when the bike was actually handed over. A precise date+time explicitly sent
        // (e.g. correcting it later via the edit form) is used exactly as chosen; otherwise —
        // the initial "mark delivered" action — default to the server's own clock rather than
        // the client's, which may have a wrong system date, as a starting point that's still
        // editable afterward.
        if (body.deliveredAt !== undefined) {
            body.deliveredAt = new Date(body.deliveredAt);
        } else if (body.status === 'DELIVERED') {
            body.deliveredAt = new Date();
        }

        const updateOps: any = { $set: body };

        // Remaining balance collected at delivery — add to advancePaid (split by cash/bank,
        // same as the initial advance) and record each as a dated payment (today), same
        // mechanism as Sale.payments, so Reports counts this cash on the day it was actually
        // collected, not the booking's original date. Split across both modes if the customer
        // paid part cash, part bank transfer.
        if (deliveryPayment) {
            const cashAmount = Number(deliveryPayment.cashAmount) || 0;
            const bankAmount = Number(deliveryPayment.bankAmount) || 0;
            const total = cashAmount + bankAmount;
            if (total > 0) {
                const now = new Date();
                const entries: any[] = [];
                if (cashAmount > 0) entries.push({ amount: cashAmount, date: now, paymentMode: 'CASH', note: 'Collected at delivery' });
                if (bankAmount > 0) entries.push({ amount: bankAmount, date: now, paymentMode: 'BANK_TRANSFER', note: 'Collected at delivery' });
                updateOps.$inc = { advancePaid: total, advanceCashAmount: cashAmount, advanceBankAmount: bankAmount };
                updateOps.$push = { payments: { $each: entries } };
            }
        }

        const booking = await AdvanceBooking.findByIdAndUpdate(id, updateOps, { new: true });
        if (!booking) return NextResponse.json({ message: 'Not found' }, { status: 404 });
        return NextResponse.json(booking);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const booking = await AdvanceBooking.findById(id);
        if (!booking) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        // Deleting a delivered booking frees up its linked bike again.
        if (booking.bikeId) {
            await Bike.findByIdAndUpdate(booking.bikeId, { status: 'AVAILABLE' });
        }

        await AdvanceBooking.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Deleted' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
