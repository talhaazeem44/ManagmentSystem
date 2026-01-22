import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, DeliveryOrder, ServiceSale } from '@/models';
import { BIKE_BOOK_PRICES } from '@/lib/constants';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        let filterStartDate: Date;
        let filterEndDate: Date;

        if (startDateStr && endDateStr) {
            filterStartDate = new Date(startDateStr);
            filterEndDate = new Date(endDateStr);
        } else {
            // Default to today
            filterStartDate = new Date();
            filterStartDate.setHours(0, 0, 0, 0);

            filterEndDate = new Date(filterStartDate);
            filterEndDate.setDate(filterEndDate.getDate() + 1);
        }

        // Get sales within range with bike details for profit calculation
        const filteredSales = await Sale.find({
            saleDate: {
                $gte: filterStartDate,
                $lt: filterEndDate
            }
        }).populate('bikeId').lean();

        // Get workshop services within range
        const filteredServices = await ServiceSale.find({
            date: {
                $gte: filterStartDate,
                $lt: filterEndDate
            }
        }).lean();

        // Get all-time stats
        const totalSalesCount = await Sale.countDocuments();
        const totalBikesCount = await Bike.countDocuments();
        const availableBikesCount = await Bike.countDocuments({ status: 'AVAILABLE' });
        const soldBikesCount = await Bike.countDocuments({ status: 'SOLD' });
        const totalServicesCount = await ServiceSale.countDocuments();

        // Get delivery order stats
        const deliveryOrders = await DeliveryOrder.find().sort({ date: -1 }).lean();
        const bikes = await Bike.find().lean();

        const doStats = deliveryOrders.map(dorder => {
            const orderBikes = bikes.filter(bike => bike.deliveryOrderId.toString() === dorder._id.toString());
            const totalBikes = orderBikes.length;
            const soldBikes = orderBikes.filter(bike => bike.status === 'SOLD').length;
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

        // Calculate revenue and profit
        const allSales = await Sale.find().populate('bikeId').lean();
        const allServices = await ServiceSale.find().lean();

        const totalRevenue = allSales.reduce((sum: number, sale: any) => sum + Number(sale.price), 0);
        const totalWorkshopRevenue = allServices.reduce((sum: number, service: any) => sum + Number(service.amount), 0);
        const totalTax = allSales.reduce((sum: number, sale: any) => sum + Number(sale.taxAmount || 0), 0);

        const totalGrossProfit = allSales.reduce((sum: number, sale: any) => {
            const soldPrice = Number(sale.price);
            const bike = sale.bikeId;
            const purchasePrice = Number(bike?.purchasePrice || BIKE_BOOK_PRICES[bike?.model] || 0);
            return sum + (soldPrice - purchasePrice);
        }, 0);

        const totalProfit = allSales.reduce((sum: number, sale: any) => {
            const soldPrice = Number(sale.price);
            const bike = sale.bikeId;
            const purchasePrice = Number(bike?.purchasePrice || BIKE_BOOK_PRICES[bike?.model] || 0);
            const taxAmount = Number(sale.taxAmount || 0);
            return sum + (soldPrice - purchasePrice - taxAmount);
        }, 0);

        const rangeRevenue = filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.price), 0);
        const rangeWorkshopRevenue = filteredServices.reduce((sum: number, service: any) => sum + Number(service.amount), 0);
        const rangeTax = filteredSales.reduce((sum: number, sale: any) => sum + Number(sale.taxAmount || 0), 0);

        const rangeGrossProfit = filteredSales.reduce((sum: number, sale: any) => {
            const soldPrice = Number(sale.price);
            const bike = sale.bikeId;
            const purchasePrice = Number(bike?.purchasePrice || BIKE_BOOK_PRICES[bike?.model] || 0);
            return sum + (soldPrice - purchasePrice);
        }, 0);

        const rangeProfit = filteredSales.reduce((sum: number, sale: any) => {
            const soldPrice = Number(sale.price);
            const bike = sale.bikeId;
            const purchasePrice = Number(bike?.purchasePrice || BIKE_BOOK_PRICES[bike?.model] || 0);
            const taxAmount = Number(sale.taxAmount || 0);
            return sum + (soldPrice - purchasePrice - taxAmount);
        }, 0);

        return NextResponse.json({
            range: {
                sales: filteredSales.length,
                revenue: rangeRevenue,
                netRevenue: rangeRevenue - rangeTax,
                workshopRevenue: rangeWorkshopRevenue,
                tax: rangeTax,
                grossProfit: rangeGrossProfit,
                profit: rangeProfit,
                startDate: filterStartDate,
                endDate: filterEndDate
            },
            allTime: {
                totalSales: totalSalesCount,
                totalRevenue: totalRevenue,
                totalNetRevenue: totalRevenue - totalTax,
                totalWorkshopRevenue: totalWorkshopRevenue,
                totalTax: totalTax,
                totalGrossProfit: totalGrossProfit,
                totalProfit: totalProfit,
                totalBikes: totalBikesCount,
                availableBikes: availableBikesCount,
                soldBikes: soldBikesCount,
                totalServices: totalServicesCount
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
