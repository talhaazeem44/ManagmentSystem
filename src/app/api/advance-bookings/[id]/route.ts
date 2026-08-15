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
        const body = await request.json();

        // Linking an inventory bike at delivery time — mark it SOLD so it's no
        // longer available elsewhere, without needing a separate Sale record.
        if (body.bikeId) {
            await Bike.findByIdAndUpdate(body.bikeId, { status: 'SOLD' });
        }

        const booking = await AdvanceBooking.findByIdAndUpdate(id, body, { new: true });
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
