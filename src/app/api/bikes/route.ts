import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Bike, DeliveryOrder, Sale, Customer } from '@/models';

export async function GET() {
    try {
        await dbConnect();

        const [bikes, deliveryOrders, sales, customers] = await Promise.all([
            Bike.find().sort({ createdAt: -1 }).lean(),
            DeliveryOrder.find().lean(),
            Sale.find().lean(),
            Customer.find().lean(),
        ]);

        const doMap = Object.fromEntries(deliveryOrders.map(d => [d._id.toString(), d]));
        const saleMap = Object.fromEntries(sales.map(s => [s.bikeId.toString(), s]));
        const customerMap = Object.fromEntries(customers.map(c => [c._id.toString(), c]));

        const bikesWithRelations = bikes.map(bike => {
            const deliveryOrder = doMap[bike.deliveryOrderId.toString()];
            const sale = saleMap[bike._id.toString()];
            const customer = sale ? customerMap[sale.customerId.toString()] : null;
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
