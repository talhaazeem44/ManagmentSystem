import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Customer } from '@/models';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const customer = await Customer.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!customer) {
            return NextResponse.json(
                { message: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(customer);
    } catch (error: any) {
        console.error('Error updating customer:', error);
        return NextResponse.json(
            { message: 'Failed to update customer', error: error.message },
            { status: 500 }
        );
    }
}
