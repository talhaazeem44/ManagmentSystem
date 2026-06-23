import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, Bike, DeliveryOrder, ServiceSale, Customer, AdvanceBooking, Expense } from '@/models';
import {
    BIKE_BOOK_PRICES,
    BIKE_STANDARD_PRICES,
    BIKE_UNIT_MARGINS,
    REGISTRATION_ACTUAL_COST,
    REGISTRATION_ACTUAL_COST_BY_MODEL
} from '@/lib/constants';

// Advance booking margin: same formula as sale — base margin + extra above standard price
const calcAdvanceMargin = (booking: any) => {
    const model = booking.bikeModel || '';
    const standardPrice = BIKE_STANDARD_PRICES[model] || 0;
    const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
    const totalPrice = Number(booking.totalPrice || 0);
    const extraCash = Math.max(0, totalPrice - standardPrice);
    return { bikeProfit: baseMargin + extraCash, standardPrice, baseMargin };
};

// Profit per sale:
// - Bike profit  = fixed margin (8k/11k/20k) + extra received above standard price
// - Reg profit   = registration charged to customer − actual government cost
const calcSaleMargin = (sale: any) => {
    const model = sale.bikeId?.model || '';
    const standardPrice = BIKE_STANDARD_PRICES[model] || Number(sale.price || 0);
    const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
    // For CREDIT sales use the agreed price (balance collected later); for cash/bank use actual received
    const totalReceived = sale.paymentMode === 'CREDIT'
        ? Number(sale.price || 0)
        : (Number(sale.receivedCash || 0) + Number(sale.bankTransferAmount || 0)) || Number(sale.price || 0);
    // Positive diff = extra earned above standard; negative diff = loss below standard (reduces base margin)
    const bikeProfit = baseMargin + (totalReceived - standardPrice);

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
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [filteredSales, filteredServices, allSales, allServices,
            totalBikesCount, availableBikesCount, soldBikesCount,
            deliveryOrders, bikes, creditSalesRaw, pendingAdvanceBookings, filteredAdvanceBookings, filteredExpenses, weekSales] = await Promise.all([
            Sale.find({ saleDate: { $gte: filterStartDate, $lt: filterEndDate } }).populate('bikeId').lean(),
            ServiceSale.find({ date: { $gte: filterStartDate, $lt: filterEndDate } }).lean(),
            Sale.find().populate('bikeId').lean(),
            ServiceSale.find().lean(),
            Bike.countDocuments(),
            Bike.countDocuments({ status: 'AVAILABLE' }),
            Bike.countDocuments({ status: 'SOLD' }),
            DeliveryOrder.find().sort({ date: -1 }).lean(),
            Bike.find().lean(),
            Sale.find({ paymentMode: 'CREDIT', balance: { $gt: 0 } }).populate('bikeId').lean(),
            AdvanceBooking.find({ status: 'PENDING' }).lean(),
            AdvanceBooking.find({ date: { $gte: filterStartDate, $lt: filterEndDate } }).lean(),
            Expense.find({ date: { $gte: filterStartDate, $lt: filterEndDate } }).lean(),
            Sale.find({ saleDate: { $gte: sevenDaysAgo } }).populate('bikeId').lean(),
        ]);

        // 7-day chart data
        const chartData = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (6 - i));
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);
            const daySales = (weekSales as any[]).filter(s => {
                const sd = new Date(s.saleDate);
                return sd >= d && sd < nextD;
            });
            return {
                day: d.toLocaleDateString('en-PK', { weekday: 'short' }),
                date: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
                sales: daySales.length,
                revenue: daySales.reduce((s, sale) => s + calcSaleMargin(sale).totalProfit, 0),
            };
        });

        const advancePendingCount = pendingAdvanceBookings.length;
        const advancePendingMargin = pendingAdvanceBookings.reduce((s: number, b: any) => s + calcAdvanceMargin(b).bikeProfit, 0);
        const now = new Date();
        const overdueBookings = (pendingAdvanceBookings as any[])
            .filter(b => b.expectedDeliveryDate && new Date(b.expectedDeliveryDate) < now)
            .map(b => ({
                _id: b._id.toString(),
                customerName: b.customerName,
                customerMobile: b.customerMobile || '',
                bikeModel: b.bikeModel || '',
                expectedDeliveryDate: b.expectedDeliveryDate,
                advancePaid: b.advancePaid,
            }));

        // Today's advance bookings cash and margin
        const rangeAdvanceCash = filteredAdvanceBookings.reduce((s: number, b: any) => s + Number(b.advancePaid || 0), 0);
        const rangeAdvanceMargin = filteredAdvanceBookings.reduce((s: number, b: any) => s + calcAdvanceMargin(b).bikeProfit, 0);

        // Attach customer info to credit sales
        const creditCustomerIds = creditSalesRaw.map((s: any) => s.customerId);
        const creditCustomers = await Customer.find({ _id: { $in: creditCustomerIds } }).lean();
        const creditSales = creditSalesRaw.map((s: any) => {
            const customer = creditCustomers.find((c: any) => c._id.toString() === s.customerId.toString());
            return {
                id: s._id.toString(),
                saleDate: s.saleDate,
                price: s.price,
                balance: s.balance,
                receivedCash: s.receivedCash,
                bankTransferAmount: s.bankTransferAmount,
                bikeModel: (s.bikeId as any)?.model || '',
                customerName: customer?.name || '',
                customerMobile: customer?.mobile || '',
                cnic: customer?.cnic || '',
            };
        });

        // ── Range: bike sales ──────────────────────────────────────────────────
        const rangeRevenue = filteredSales.reduce((s, sale: any) => s + Number(sale.price || 0), 0);
        // ── Expenses ───────────────────────────────────────────────────────────
        const expenseCash = filteredExpenses.reduce((s: number, e: any) => e.deductFrom === 'CASH' ? s + Number(e.amount || 0) : s, 0);
        const expenseMargin = filteredExpenses.reduce((s: number, e: any) => e.deductFrom === 'MARGIN' ? s + Number(e.amount || 0) : s, 0);
        const expensesByCategory = filteredExpenses.reduce((acc: Record<string, number>, e: any) => {
            const cat = e.category || 'Other';
            acc[cat] = (acc[cat] || 0) + Number(e.amount || 0);
            return acc;
        }, {});
        const expenseList = filteredExpenses.map((e: any) => ({
            date: e.date,
            description: e.description || '',
            category: e.category || 'Other',
            deductFrom: e.deductFrom,
            amount: Number(e.amount || 0),
        }));

        const rangeCashReceived = filteredSales.reduce((s, sale: any) => s + Number(sale.receivedCash || 0), 0) + rangeAdvanceCash;
        const rangeRegistration = filteredSales.reduce((s, sale: any) => s + Number(sale.registrationCost || 0), 0);
        const rangeBankTransfer = filteredSales.reduce((s, sale: any) => s + Number(sale.bankTransferAmount || 0), 0);
        const rangeTotalCashIn = rangeCashReceived + rangeRegistration;
        const rangeCashToDeposit = filteredSales.reduce((s, sale: any) => {
            const model = sale.bikeId?.model || '';
            return s + Number(sale.bikeId?.purchasePrice || BIKE_BOOK_PRICES[model] || 0);
        }, 0);
        // Honda deposit only for sales where cash was actually received
        const rangeCashDepositOnly = filteredSales.reduce((s, sale: any) => {
            if (Number(sale.receivedCash || 0) <= 0) return s;
            const model = sale.bikeId?.model || '';
            return s + Number(sale.bikeId?.purchasePrice || BIKE_BOOK_PRICES[model] || 0);
        }, 0);
        const rangeCashInHand = Math.max(0, rangeTotalCashIn - rangeCashToDeposit - expenseCash);

        const modelBreakdown: Record<string, number> = {};
        for (const sale of filteredSales as any[]) {
            const model = sale.bikeId?.model || 'Unknown';
            modelBreakdown[model] = (modelBreakdown[model] || 0) + 1;
        }

        const rangeBikeProfit = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).bikeProfit, 0) + rangeAdvanceMargin;
        const rangeRegProfit = filteredSales.reduce((s, sale: any) => s + calcSaleMargin(sale).regProfit, 0);
        // Extra = amount received above standard price (positive = profit boost, negative = loss)
        const rangeExtraCash = filteredSales.reduce((s, sale: any) => {
            const model = sale.bikeId?.model || '';
            const standardPrice = BIKE_STANDARD_PRICES[model] || Number(sale.price || 0);
            const totalReceived = sale.paymentMode === 'CREDIT'
                ? Number(sale.price || 0)
                : (Number(sale.receivedCash || 0) + Number(sale.bankTransferAmount || 0)) || Number(sale.price || 0);
            return s + (totalReceived - standardPrice);
        }, 0);

        // ── Range: workshop ────────────────────────────────────────────────────
        const rangeWorkshopRevenue = filteredServices.reduce((s, svc: any) => s + Number(svc.totalAmount || 0), 0);
        const rangeWorkshopProfit = filteredServices.reduce((s, svc: any) => s + Number(svc.margin || 0), 0);

        const rangeProfit = rangeBikeProfit + rangeRegProfit + rangeWorkshopProfit - expenseMargin;

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

        const cashBreakdown = [
            ...filteredSales.map((sale: any) => {
                const m = calcSaleMargin(sale);
                return {
                    bikeModel: sale.bikeId?.model || '?',
                    paymentMode: sale.paymentMode || 'CASH',
                    price: Number(sale.price || 0),
                    receivedCash: Number(sale.receivedCash || 0),
                    bankTransferAmount: Number(sale.bankTransferAmount || 0),
                    counted: Number(sale.receivedCash || 0),
                    bikeProfit: m.bikeProfit,
                    regProfit: m.regProfit,
                    totalProfit: m.totalProfit,
                    standardPrice: BIKE_STANDARD_PRICES[sale.bikeId?.model || ''] || 0,
                    baseMargin: BIKE_UNIT_MARGINS[sale.bikeId?.model || ''] || 0,
                };
            }),
            ...filteredAdvanceBookings.map((b: any) => {
                const am = calcAdvanceMargin(b);
                return {
                    bikeModel: b.bikeModel || 'Advance',
                    paymentMode: 'ADVANCE',
                    price: Number(b.totalPrice || 0),
                    receivedCash: Number(b.advancePaid || 0),
                    bankTransferAmount: 0,
                    counted: Number(b.advancePaid || 0),
                    bikeProfit: am.bikeProfit,
                    regProfit: 0,
                    totalProfit: am.bikeProfit,
                    standardPrice: am.standardPrice,
                    baseMargin: am.baseMargin,
                };
            }),
        ];

        return NextResponse.json({
            range: {
                sales: filteredSales.length,
                revenue: rangeRevenue,
                workshopRevenue: rangeWorkshopRevenue,
                bikeProfit: rangeBikeProfit,
                advanceMargin: rangeAdvanceMargin,
                regProfit: rangeRegProfit,
                workshopProfit: rangeWorkshopProfit,
                profit: rangeProfit,
                cashReceived: rangeCashReceived,
                registrationCollected: rangeRegistration,
                totalCashIn: rangeTotalCashIn,
                bankTransfer: rangeBankTransfer,
                cashToDeposit: rangeCashToDeposit,
                expenseCash: expenseCash,
                expenseMargin: expenseMargin,
                extraCash: rangeExtraCash,
                modelBreakdown,
                expensesByCategory,
                expenseList,
                cashInHand: rangeCashInHand,
                cashDepositOnly: rangeCashDepositOnly,
                startDate: filterStartDate,
                endDate: filterEndDate,
            },
            cashBreakdown,
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
            creditSales,
            advanceBookings: {
                pendingCount: advancePendingCount,
                pendingMargin: advancePendingMargin,
                overdueBookings,
            },
            chartData,
        });
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
