import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const sale = await prisma.sale.findUnique({
            where: { id: parseInt(params.id) },
            include: {
                bike: {
                    include: {
                        deliveryOrder: true
                    }
                },
                customer: true
            }
        });

        if (!sale) {
            return NextResponse.json(
                { message: 'Sale not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(sale);
    } catch (error: any) {
        console.error('Error fetching sale:', error);
        return NextResponse.json(
            { message: 'Failed to fetch sale', error: error.message },
            { status: 500 }
        );
    }
}
