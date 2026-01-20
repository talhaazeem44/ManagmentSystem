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
