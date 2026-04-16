import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Customer } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const cnic = searchParams.get('cnic');

        if (!cnic) {
            return NextResponse.json({ message: 'cnic query param required' }, { status: 400 });
        }

        const customer = await Customer.findOne({ cnic }).lean();

        if (!customer) {
            return NextResponse.json(null);
        }

        return NextResponse.json(customer);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch customer', error: error.message }, { status: 500 });
    }
}
