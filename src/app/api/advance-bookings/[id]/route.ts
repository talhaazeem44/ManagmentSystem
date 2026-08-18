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

        const updateOps: any = { $set: body };

        // Remaining balance collected at delivery — add to advancePaid and record as
        // a dated payment (today), same mechanism as Sale.payments, so Reports counts
        // this cash on the day it was actually collected, not the booking's original date.
        if (deliveryPayment && Number(deliveryPayment.amount) > 0) {
            const amount = Number(deliveryPayment.amount);
            const mode: 'CASH' | 'BANK_TRANSFER' = deliveryPayment.paymentMode === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH';
            updateOps.$inc = { advancePaid: amount };
            updateOps.$push = { payments: { amount, date: new Date(), paymentMode: mode, note: 'Collected at delivery' } };
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
