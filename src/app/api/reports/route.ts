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

        // ── Range sales ────────────────────────────────────────────────────────
        const filteredSales = await Sale.find({
            saleDate: { $gte: filterStartDate, $lt: filterEndDate }
        }).populate('bikeId').lean();

        // ── Range workshop ─────────────────────────────────────────────────────
        const filteredServices = await ServiceSale.find({
            date: { $gte: filterStartDate, $lt: filterEndDate }
        }).lean();

        // ── All-time counts ────────────────────────────────────────────────────
        const totalBikesCount = await Bike.countDocuments();
        const availableBikesCount = await Bike.countDocuments({ status: 'AVAILABLE' });
        const soldBikesCount = await Bike.countDocuments({ status: 'SOLD' });

        // ── Delivery order stats ───────────────────────────────────────────────
        const deliveryOrders = await DeliveryOrder.find().sort({ date: -1 }).lean();
        const bikes = await Bike.find().lean();

        const doStats = deliveryOrders.map(dorder => {
            const orderBikes = bikes.filter(b => b.deliveryOrderId.toString() === dorder._id.toString());
            const totalBikes = orderBikes.length;
            const soldBikes = orderBikes.filter(b => b.status === 'SOLD').length;
            return {
                doNumber: dorder.doNumber,
                date: dorder.date,
                totalBikes,
                soldBikes,
                remainingBikes: totalBikes - soldBikes,
                dealerName: dorder.dealerName,
            };
        });

        // ── Margin calculation helper ─────────────────────────────────────────
        const calcSaleMargin = (sale: any) => {
            const bike = sale.bikeId;
            const model = bike?.model || '';
            const actualSoldPrice = Number(sale.price || 0);
            const purchasePrice = Number(bike?.purchasePrice || BIKE_BOOK_PRICES[model] || 0);
            const standardPrice = BIKE_STANDARD_PRICES[model] || actualSoldPrice;
            const unitMargin = BIKE_UNIT_MARGINS[model] || (standardPrice - purchasePrice);
            const blackMargin = Math.max(0, actualSoldPrice - standardPrice); // extra above standard price
            const regCharged = Number(sale.registrationCost || 0);
            const actualRegCost = REGISTRATION_ACTUAL_COST_BY_MODEL[model] ?? REGISTRATION_ACTUAL_COST;
            const regMargin = regCharged > 0 ? regCharged - actualRegCost : 0;
            const totalMargin = unitMargin + blackMargin + regMargin;
            return { unitMargin, blackMargin, regMargin, totalMargin, purchasePrice };
        };

        // ── Range calculations ─────────────────────────────────────────────────
        const rangeRevenue = filteredSales.reduce((s, sale: any) => s + Number(sale.price || 0), 0);
        const rangeCashReceived = filteredSales.reduce((s, sale: any) => s + Number(sale.receivedCash || sale.price || 0), 0);
        const rangeRegistrationCollected = filteredSales.reduce((s, sale: any) => s + Number(sale.registrationCost || 0), 0);
        const rangeTotalCashIn = rangeCashReceived + rangeRegistrationCollected;
        const rangePurchaseCost = filteredSales.reduce((s, sale: any) => {
            const bike = (sale as any).bikeId;
            return s + Number(bike?.purchasePrice || BIKE_BOOK_PRICES[bike?.model] || 0);
        }, 0);
        const rangeCashToDeposit = rangePurchaseCost;
        const rangeCashInHand = rangeTotalCashIn - rangeCashToDeposit;

        const rangeUnitMargin = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).unitMargin, 0);
        const rangeBlackMargin = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).blackMargin, 0);
        const rangeRegMargin = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).regMargin, 0);
        const rangeBikeMargin = rangeUnitMargin + rangeBlackMargin + rangeRegMargin;

        const rangeWorkshopRevenue = filteredServices.reduce((s, svc: any) => s + Number(svc.totalAmount || svc.amount || 0), 0);
        const rangeWorkshopProfit = filteredServices.reduce((s, svc: any) => s + Number(svc.margin || svc.totalAmount || svc.amount || 0), 0);

        const rangeTotalProfit = rangeBikeMargin + rangeWorkshopProfit;

        return NextResponse.json({
            range: {
                sales: filteredSales.length,
                revenue: rangeRevenue,
                workshopRevenue: rangeWorkshopRevenue,
                workshopProfit: rangeWorkshopProfit,
                // Margin breakdown
                unitMargin: rangeUnitMargin,
                blackMargin: rangeBlackMargin,
                regMargin: rangeRegMargin,
                bikeMargin: rangeBikeMargin,
                totalProfit: rangeTotalProfit,
                // Cash tracking
                cashReceived: rangeCashReceived,
                registrationCollected: rangeRegistrationCollected,
                totalCashIn: rangeTotalCashIn,
                cashToDeposit: rangeCashToDeposit,
                cashInHand: rangeCashInHand,
                startDate: filterStartDate,
                endDate: filterEndDate,
            },
            allTime: {
                totalBikes: totalBikesCount,
                availableBikes: availableBikesCount,
                soldBikes: soldBikesCount,
            },
            deliveryOrders: doStats,
        });
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
