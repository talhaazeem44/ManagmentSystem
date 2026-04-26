import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, DeliveryOrder, ServiceSale } from '@/models';
import {
    BIKE_BOOK_PRICES,
    BIKE_STANDARD_PRICES,
    BIKE_UNIT_MARGINS,
    REGISTRATION_ACTUAL_COST,
    REGISTRATION_ACTUAL_COST_BY_MODEL
} from '@/lib/constants';

// Profit per sale:
// - Bike profit  = fixed margin (8k/11k/20k) + extra received above standard price
// - Reg profit   = registration charged to customer − actual government cost
const calcSaleMargin = (sale: any) => {
    const model = sale.bikeId?.model || '';
    const standardPrice = BIKE_STANDARD_PRICES[model] || Number(sale.price || 0);
    const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
    const receivedCash = Number(sale.receivedCash || sale.price || 0);
    const extraCash = Math.max(0, receivedCash - standardPrice);
    const bikeProfit = baseMargin + extraCash;

    const regCharged = Number(sale.registrationCost || 0);
    const actualRegCost = REGISTRATION_ACTUAL_COST_BY_MODEL[model] ?? REGISTRATION_ACTUAL_COST;
    const regProfit = regCharged > 0 ? regCharged - actualRegCost : 0;

    return { bikeProfit, regProfit, totalProfit: bikeProfit + regProfit };
};

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
            filterStartDate = new Date();
            filterStartDate.setHours(0, 0, 0, 0);
            filterEndDate = new Date(filterStartDate);
            filterEndDate.setDate(filterEndDate.getDate() + 1);
        }

        // ── Fetch data ─────────────────────────────────────────────────────────
        const [filteredSales, filteredServices, allSales, allServices,
            totalBikesCount, availableBikesCount, soldBikesCount,
            deliveryOrders, bikes] = await Promise.all([
            Sale.find({ saleDate: { $gte: filterStartDate, $lt: filterEndDate } }).populate('bikeId').lean(),
            ServiceSale.find({ date: { $gte: filterStartDate, $lt: filterEndDate } }).lean(),
            Sale.find().populate('bikeId').lean(),
            ServiceSale.find().lean(),
            Bike.countDocuments(),
            Bike.countDocuments({ status: 'AVAILABLE' }),
            Bike.countDocuments({ status: 'SOLD' }),
            DeliveryOrder.find().sort({ date: -1 }).lean(),
            Bike.find().lean(),
        ]);

        // ── Range: bike sales ──────────────────────────────────────────────────
        const rangeRevenue = filteredSales.reduce((s, sale: any) => s + Number(sale.price || 0), 0);
        const rangeCashReceived = filteredSales.reduce((s, sale: any) => s + Number(sale.receivedCash || sale.price || 0), 0);
        const rangeRegistration = filteredSales.reduce((s, sale: any) => s + Number(sale.registrationCost || 0), 0);
        const rangeBankTransfer = filteredSales.reduce((s, sale: any) => s + Number(sale.bankTransferAmount || 0), 0);
        const rangeTotalCashIn = rangeCashReceived + rangeRegistration;
        const rangeCashToDeposit = filteredSales.reduce((s, sale: any) => {
            const model = sale.bikeId?.model || '';
            return s + Number(sale.bikeId?.purchasePrice || BIKE_BOOK_PRICES[model] || 0);
        }, 0);
        const rangeCashInHand = Math.max(0, rangeTotalCashIn - rangeCashToDeposit);

        const rangeBikeProfit = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).bikeProfit, 0);
        const rangeRegProfit = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).regProfit, 0);

        // ── Range: workshop ────────────────────────────────────────────────────
        const rangeWorkshopRevenue = filteredServices.reduce((s, svc: any) => s + Number(svc.totalAmount || 0), 0);
        const rangeWorkshopProfit = filteredServices.reduce((s, svc: any) => s + Number(svc.margin || 0), 0);

        const rangeProfit = rangeBikeProfit + rangeRegProfit + rangeWorkshopProfit;

        // ── All-time ───────────────────────────────────────────────────────────
        const allTimeRevenue = allSales.reduce((s, sale: any) => s + Number(sale.price || 0), 0);
        const allTimeBikeProfit = allSales.reduce((s, sale: any) => s + calcSaleMargin(sale).totalProfit, 0);
        const allTimeWorkshopRevenue = allServices.reduce((s, svc: any) => s + Number(svc.totalAmount || 0), 0);
        const allTimeWorkshopProfit = allServices.reduce((s, svc: any) => s + Number(svc.margin || 0), 0);
        const allTimeProfit = allTimeBikeProfit + allTimeWorkshopProfit;

        // ── Delivery orders ────────────────────────────────────────────────────
        const doStats = deliveryOrders.map((dorder: any) => {
            const orderBikes = bikes.filter((b: any) => b.deliveryOrderId.toString() === dorder._id.toString());
            return {
                doNumber: dorder.doNumber,
                date: dorder.date,
                dealerName: dorder.dealerName,
                totalBikes: orderBikes.length,
                soldBikes: orderBikes.filter((b: any) => b.status === 'SOLD').length,
                remainingBikes: orderBikes.filter((b: any) => b.status === 'AVAILABLE').length,
            };
        });

        return NextResponse.json({
            range: {
                sales: filteredSales.length,
                revenue: rangeRevenue,
                workshopRevenue: rangeWorkshopRevenue,
                bikeProfit: rangeBikeProfit,
                regProfit: rangeRegProfit,
                workshopProfit: rangeWorkshopProfit,
                profit: rangeProfit,
                cashReceived: rangeCashReceived,
                registrationCollected: rangeRegistration,
                totalCashIn: rangeTotalCashIn,
                bankTransfer: rangeBankTransfer,
                cashToDeposit: rangeCashToDeposit,
                cashInHand: rangeCashInHand,
                startDate: filterStartDate,
                endDate: filterEndDate,
            },
            allTime: {
                totalBikes: totalBikesCount,
                availableBikes: availableBikesCount,
                soldBikes: soldBikesCount,
                totalSales: allSales.length,
                totalRevenue: allTimeRevenue,
                totalWorkshopRevenue: allTimeWorkshopRevenue,
                totalProfit: allTimeProfit,
            },
            deliveryOrders: doStats,
        });
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
