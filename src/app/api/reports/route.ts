import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's sales
        const todaySales = await prisma.sale.findMany({
            where: {
                saleDate: {
                    gte: today,
                    lt: tomorrow
                }
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

        // Get all-time stats
        const totalSales = await prisma.sale.count();
        const totalBikes = await prisma.bike.count();
        const availableBikes = await prisma.bike.count({
            where: { status: 'AVAILABLE' }
        });
        const soldBikes = await prisma.bike.count({
            where: { status: 'SOLD' }
        });

        // Get delivery order stats
        const deliveryOrders = await prisma.deliveryOrder.findMany({
            include: {
                bikes: {
                    include: {
                        sale: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        const doStats = deliveryOrders.map(dorder => {
            const totalBikes = dorder.bikes.length;
            const soldBikes = dorder.bikes.filter(bike => bike.status === 'SOLD').length;
            const remainingBikes = totalBikes - soldBikes;

            return {
                doNumber: dorder.doNumber,
                date: dorder.date,
                totalBikes,
                soldBikes,
                remainingBikes,
                dealerName: dorder.dealerName
            };
        });

        // Calculate revenue
        const allSales = await prisma.sale.findMany();
        const totalRevenue = allSales.reduce((sum, sale) => sum + Number(sale.price), 0);
        const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.price), 0);

        return NextResponse.json({
            today: {
                sales: todaySales.length,
                revenue: todayRevenue
            },
            allTime: {
                totalSales,
                totalRevenue,
                totalBikes,
                availableBikes,
                soldBikes
            },
            deliveryOrders: doStats
        });
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { message: 'Failed to fetch reports', error: error.message },
            { status: 500 }
        );
    }
}
