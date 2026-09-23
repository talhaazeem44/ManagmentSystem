import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdvanceBooking, Bike } from '@/models';
import { calcAdvanceMargin } from '@/lib/constants';

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
        const { deliveryPayment: payment, ...body } = await request.json();

        const existing = await AdvanceBooking.findById(id);
        if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

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

        // Recompute margin whenever the bike model, sale price, or registration fee changes —
        // e.g. the customer swaps to a different bike before delivery — so margin never goes
        // stale relative to whatever is actually on the booking now.
        if (body.bikeModel !== undefined || body.totalPrice !== undefined || body.registrationFee !== undefined) {
            const bikeModel = body.bikeModel !== undefined ? body.bikeModel : existing.bikeModel;
            const totalPrice = body.totalPrice !== undefined ? Number(body.totalPrice) : Number(existing.totalPrice || 0);
            const registrationFee = body.registrationFee !== undefined ? Number(body.registrationFee) : Number(existing.registrationFee || 0);
            body.margin = bikeModel && totalPrice ? calcAdvanceMargin(bikeModel, totalPrice, registrationFee) : 0;
        }

        const updateOps: any = { $set: body };

        // Extra money received against this booking — either the remaining balance collected
        // at delivery, or an additional advance payment made while still pending. Either way:
        // add to advancePaid (split by cash/bank, same as the initial advance) and record each
        // as a dated payment (today), same mechanism as Sale.payments, so Reports counts this
        // cash on the day it was actually collected, not the booking's original date. Split
        // across both modes if the customer paid part cash, part bank transfer.
        if (payment) {
            const cashAmount = Number(payment.cashAmount) || 0;
            const bankAmount = Number(payment.bankAmount) || 0;
            const total = cashAmount + bankAmount;
            if (total > 0) {
                const now = new Date();
                const note = body.status === 'DELIVERED' ? 'Collected at delivery' : 'Additional advance payment';
                const entries: any[] = [];
                if (cashAmount > 0) entries.push({ amount: cashAmount, date: now, paymentMode: 'CASH', note });
                if (bankAmount > 0) entries.push({ amount: bankAmount, date: now, paymentMode: 'BANK_TRANSFER', note });
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
