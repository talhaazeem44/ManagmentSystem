import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { DeliveryOrder, Bike } from '@/models';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { doNumber, date, dealerName, dealerAddress, bikes } = body;

        // Validate required fields
        if (!doNumber || !date || !dealerName || !dealerAddress || !bikes || bikes.length === 0) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create delivery order
        const deliveryOrder = await DeliveryOrder.create({
            doNumber,
            date: new Date(date),
            dealerName,
            dealerAddress,
        });

        // Create bikes
        const createdBikes = await Bike.insertMany(
            bikes.map((bike: any) => ({
                model: bike.model,
                color: bike.color,
                engineNumber: bike.engineNumber,
                chassisNumber: bike.chassisNumber,
                purchasePrice: Number(bike.purchasePrice) || 0,
                status: 'AVAILABLE',
                deliveryOrderId: deliveryOrder._id,
            }))
        );

        return NextResponse.json({
            ...deliveryOrder.toObject(),
            bikes: createdBikes
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating delivery order:', error);

        if (error.code === 11000) {
            return NextResponse.json(
                { message: 'Duplicate entry: DO number, engine number, or chassis number already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: 'Failed to create delivery order', error: error.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        await dbConnect();

        const deliveryOrders = await DeliveryOrder.find().sort({ createdAt: -1 }).lean();
        const bikes = await Bike.find().lean();

        // Group bikes by delivery order
        const ordersWithBikes = deliveryOrders.map(order => ({
            ...order,
            bikes: bikes.filter(bike => bike.deliveryOrderId.toString() === order._id.toString())
        }));

        return NextResponse.json(ordersWithBikes);
    } catch (error: any) {
        console.error('Error fetching delivery orders:', error);
        return NextResponse.json(
            { message: 'Failed to fetch delivery orders', error: error.message },
            { status: 500 }
        );
    }
}
