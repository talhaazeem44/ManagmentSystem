import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AdvanceBooking } from '@/models';
import {
    BIKE_STANDARD_PRICES,
    BIKE_UNIT_MARGINS,
    REGISTRATION_ACTUAL_COST,
    REGISTRATION_ACTUAL_COST_BY_MODEL,
} from '@/lib/constants';

function calcAdvanceMargin(bikeModel: string, totalPrice: number, registrationFee: number) {
    const standard = BIKE_STANDARD_PRICES[bikeModel] || totalPrice;
    const base = BIKE_UNIT_MARGINS[bikeModel] || 0;
    const extra = Math.max(0, totalPrice - standard);
    const bikeProfit = base + extra;
    const actualReg = REGISTRATION_ACTUAL_COST_BY_MODEL[bikeModel] ?? REGISTRATION_ACTUAL_COST;
    const regProfit = registrationFee > 0 ? registrationFee - actualReg : 0;
    return bikeProfit + regProfit;
}

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
        const { customerName, customerMobile, cnic, bikeModel, bikeColor, advancePaid, totalPrice, registrationFee, notes } = body;

        if (!customerName || advancePaid === undefined) {
            return NextResponse.json({ message: 'Customer name and advance amount are required' }, { status: 400 });
        }

        const price = totalPrice ? Number(totalPrice) : 0;
        const regFee = registrationFee ? Number(registrationFee) : 0;
        const margin = bikeModel && price ? calcAdvanceMargin(bikeModel, price, regFee) : 0;

        const booking = await AdvanceBooking.create({
            customerName,
            customerMobile,
            cnic,
            bikeModel,
            bikeColor,
            advancePaid: Number(advancePaid),
            totalPrice: price || undefined,
            registrationFee: regFee,
            margin,
            notes,
            status: 'PENDING',
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
