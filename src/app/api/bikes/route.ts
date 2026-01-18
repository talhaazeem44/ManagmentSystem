import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const bikes = await prisma.bike.findMany({
            include: {
                deliveryOrder: true,
                sale: {
                    include: {
                        customer: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(bikes);
    } catch (error: any) {
        console.error('Error fetching bikes:', error);
        return NextResponse.json(
            { message: 'Failed to fetch bikes', error: error.message },
            { status: 500 }
        );
    }
}
