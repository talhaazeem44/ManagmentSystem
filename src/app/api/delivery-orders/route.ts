import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { doNumber, date, dealerName, dealerAddress, bikes } = body;

        // Validate required fields
        if (!doNumber || !date || !dealerName || !dealerAddress || !bikes || bikes.length === 0) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create delivery order with bikes
        const deliveryOrder = await prisma.deliveryOrder.create({
            data: {
                doNumber,
                date: new Date(date),
                dealerName,
                dealerAddress,
                bikes: {
                    create: bikes.map((bike: any) => ({
                        model: bike.model,
                        color: bike.color,
                        engineNumber: bike.engineNumber,
                        chassisNumber: bike.chassisNumber,
                        status: 'AVAILABLE'
                    }))
                }
            },
            include: {
                bikes: true
            }
        });

        return NextResponse.json(deliveryOrder, { status: 201 });
    } catch (error: any) {
        console.error('Error creating delivery order:', error);

        if (error.code === 'P2002') {
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
        const deliveryOrders = await prisma.deliveryOrder.findMany({
            include: {
                bikes: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(deliveryOrders);
    } catch (error: any) {
        console.error('Error fetching delivery orders:', error);
        return NextResponse.json(
            { message: 'Failed to fetch delivery orders', error: error.message },
            { status: 500 }
        );
    }
}
