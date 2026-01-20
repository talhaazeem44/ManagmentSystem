import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Bike, DeliveryOrder, Sale, Customer } from '@/models';

export async function GET() {
    try {
        await dbConnect();

        const bikes = await Bike.find().sort({ createdAt: -1 }).lean();
        const deliveryOrders = await DeliveryOrder.find().lean();
        const sales = await Sale.find().lean();
        const customers = await Customer.find().lean();

        // Populate relationships manually
        const bikesWithRelations = bikes.map(bike => {
            const deliveryOrder = deliveryOrders.find(
                d => d._id.toString() === bike.deliveryOrderId.toString()
            );
            const sale = sales.find(s => s.bikeId.toString() === bike._id.toString());
            const customer = sale ? customers.find(c => c._id.toString() === sale.customerId.toString()) : null;

            return {
                ...bike,
                id: bike._id.toString(),
                deliveryOrder,
                sale: sale ? { ...sale, customer } : null
            };
        });

        return NextResponse.json(bikesWithRelations);
    } catch (error: any) {
        console.error('Error fetching bikes:', error);
        return NextResponse.json(
            { message: 'Failed to fetch bikes', error: error.message },
            { status: 500 }
        );
    }
}
