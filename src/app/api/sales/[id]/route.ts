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

        // Special handler: record a payment against a credit sale
        if (body.addPayment) {
            const { amount, date, note } = body.addPayment;
            const paymentAmount = Number(amount);
            const existing = await Sale.findById(id);
            if (!existing) return NextResponse.json({ message: 'Sale not found' }, { status: 404 });

            const newBalance = Math.max(0, Number(existing.balance ?? 0) - paymentAmount);
            const sale = await Sale.findByIdAndUpdate(
                id,
                {
                    $push: { payments: { amount: paymentAmount, date: new Date(date), note: note || '' } },
                    $inc: { receivedCash: paymentAmount },
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
