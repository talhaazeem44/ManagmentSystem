import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdvanceBooking } from '@/models';
import { calcAdvanceMargin } from '@/lib/constants';
import { resolveTransactionDate } from '@/lib/dates';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale list to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const bookings = await AdvanceBooking.find().sort({ date: -1 }).lean();
        return NextResponse.json(bookings);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { customerName, customerMobile, cnic, address, bikeModel, bikeColor, careOf, advanceCashAmount, advanceBankAmount, totalPrice, registrationFee, notes, expectedDeliveryDate, date } = body;

        const cashAmount = Number(advanceCashAmount) || 0;
        const bankAmount = Number(advanceBankAmount) || 0;
        const totalAdvance = cashAmount + bankAmount;

        if (!customerName || totalAdvance <= 0) {
            return NextResponse.json({ message: 'Customer name and at least one advance amount (cash or bank) are required' }, { status: 400 });
        }

        const price = totalPrice ? Number(totalPrice) : 0;
        const regFee = registrationFee ? Number(registrationFee) : 0;
        const margin = bikeModel && price ? calcAdvanceMargin(bikeModel, price, regFee) : 0;

        const booking = await AdvanceBooking.create({
            customerName,
            customerMobile,
            cnic,
            address,
            bikeModel,
            bikeColor,
            careOf,
            advancePaid: totalAdvance,
            advanceCashAmount: cashAmount,
            advanceBankAmount: bankAmount,
            // Legacy field — best-effort label for old code paths that still read it directly.
            advancePaymentMode: bankAmount > 0 && cashAmount === 0 ? 'BANK_TRANSFER' : 'CASH',
            totalPrice: price || undefined,
            registrationFee: regFee,
            margin,
            notes,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
            date: date ? resolveTransactionDate(date) : undefined,
            status: 'PENDING',
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
