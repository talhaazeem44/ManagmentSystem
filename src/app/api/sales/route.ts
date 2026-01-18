import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            bikeId,
            customer,
            price,
            registrationCost,
            paymentMode,
            receiptNumber
        } = body;

        // Validate required fields
        if (!bikeId || !customer || !price) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if bike exists and is available
        const bike = await prisma.bike.findUnique({
            where: { id: parseInt(bikeId) }
        });

        if (!bike) {
            return NextResponse.json(
                { message: 'Bike not found' },
                { status: 404 }
            );
        }

        if (bike.status === 'SOLD') {
            return NextResponse.json(
                { message: 'Bike is already sold' },
                { status: 400 }
            );
        }

        // Create or find customer
        let customerRecord = await prisma.customer.findUnique({
            where: { cnic: customer.cnic }
        });

        if (!customerRecord) {
            customerRecord = await prisma.customer.create({
                data: {
                    cnic: customer.cnic,
                    name: customer.name,
                    fatherName: customer.fatherName,
                    address: customer.address,
                    mobile: customer.mobile
                }
            });
        }

        // Create sale and update bike status
        const sale = await prisma.sale.create({
            data: {
                bikeId: parseInt(bikeId),
                customerId: customerRecord.id,
                price: parseFloat(price),
                registrationCost: registrationCost ? parseFloat(registrationCost) : null,
                paymentMode: paymentMode || 'CASH',
                receiptNumber
            },
            include: {
                bike: {
                    include: {
                        deliveryOrder: true
                    }
                },
                customer: true
            }
        });

        // Update bike status
        await prisma.bike.update({
            where: { id: parseInt(bikeId) },
            data: { status: 'SOLD' }
        });

        return NextResponse.json(sale, { status: 201 });
    } catch (error: any) {
        console.error('Error creating sale:', error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { message: 'Duplicate entry: This bike is already sold or CNIC already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: 'Failed to create sale', error: error.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                bike: {
                    include: {
                        deliveryOrder: true
                    }
                },
                customer: true
            },
            orderBy: {
                saleDate: 'desc'
            }
        });

        return NextResponse.json(sales);
    } catch (error: any) {
        console.error('Error fetching sales:', error);
        return NextResponse.json(
            { message: 'Failed to fetch sales', error: error.message },
            { status: 500 }
        );
    }
}
