import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ServiceSale, WorkshopStock } from '@/models';

const DEFAULT_LOW_STOCK_THRESHOLD = 1;

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const lowStockThreshold = Number(searchParams.get('lowStockThreshold')) || DEFAULT_LOW_STOCK_THRESHOLD;

        const filter: any = {};
        if (startDateStr && endDateStr) {
            filter.date = { $gte: new Date(startDateStr), $lt: new Date(endDateStr) };
        }

        const sales = await ServiceSale.find(filter).sort({ date: -1 }).lean();

        const totalRevenue = sales.reduce((s, r: any) => s + Number(r.totalAmount || 0), 0);
        const totalMargin = sales.reduce((s, r: any) => s + Number(r.margin || 0), 0);
        const totalLabour = sales.reduce((s, r: any) => s + Number(r.serviceCharges || 0), 0);
        const totalPartsRevenue = sales.reduce((s, r: any) =>
            s + (r.items || []).reduce((si: number, it: any) => si + Number(it.customerPrice || 0) * Number(it.quantity || 0), 0), 0);
        const jobCount = sales.length;
        const avgTicket = jobCount > 0 ? totalRevenue / jobCount : 0;

        // Cash/bank actually received in this window — for cross-checking against physical
        // cash in hand. A CASH/BANK_TRANSFER job counts its full amount on its own date; a
        // CREDIT job counts nothing up front (its upfront amount's mode isn't tracked), but
        // later payments against it count on the day the cash actually came in, not the
        // job's original date — same cross-boundary logic used for bike Sales/Khata.
        const directCashReceived = sales.reduce((s, r: any) => s + (r.paymentMode === 'CASH' ? Number(r.totalAmount || 0) : 0), 0);
        const directBankReceived = sales.reduce((s, r: any) => s + (r.paymentMode === 'BANK_TRANSFER' ? Number(r.totalAmount || 0) : 0), 0);

        let creditPaymentsCash = 0;
        let creditPaymentsBank = 0;
        if (startDateStr && endDateStr) {
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            const creditSales = await ServiceSale.find({ 'payments.0': { $exists: true } }).select('payments').lean();
            for (const cs of creditSales as any[]) {
                for (const p of cs.payments || []) {
                    const pd = new Date(p.date);
                    if (pd < start || pd >= end) continue;
                    if (p.paymentMode === 'BANK_TRANSFER') creditPaymentsBank += Number(p.amount || 0);
                    else creditPaymentsCash += Number(p.amount || 0);
                }
            }
        } else {
            const creditSales = await ServiceSale.find({ 'payments.0': { $exists: true } }).select('payments').lean();
            for (const cs of creditSales as any[]) {
                for (const p of cs.payments || []) {
                    if (p.paymentMode === 'BANK_TRANSFER') creditPaymentsBank += Number(p.amount || 0);
                    else creditPaymentsCash += Number(p.amount || 0);
                }
            }
        }
        const totalCashReceived = directCashReceived + creditPaymentsCash;
        const totalBankReceived = directBankReceived + creditPaymentsBank;

        const byServiceType: Record<string, { count: number; revenue: number; margin: number }> = {};
        for (const r of sales as any[]) {
            const key = r.serviceType || 'Other';
            if (!byServiceType[key]) byServiceType[key] = { count: 0, revenue: 0, margin: 0 };
            byServiceType[key].count += 1;
            byServiceType[key].revenue += Number(r.totalAmount || 0);
            byServiceType[key].margin += Number(r.margin || 0);
        }

        // Last 7 days chart data (independent of the selected range, for a consistent trend view)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const weekSales = await ServiceSale.find({ date: { $gte: sevenDaysAgo } }).lean();
        const chartData = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (6 - i));
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);
            const dayJobs = (weekSales as any[]).filter(r => {
                const rd = new Date(r.date);
                return rd >= d && rd < nextD;
            });
            return {
                day: d.toLocaleDateString('en-PK', { weekday: 'short' }),
                jobs: dayJobs.length,
                revenue: dayJobs.reduce((s, r) => s + Number(r.totalAmount || 0), 0),
                margin: dayJobs.reduce((s, r) => s + Number(r.margin || 0), 0),
            };
        });

        const lowStockItems = await WorkshopStock.find({ quantity: { $lte: lowStockThreshold } })
            .sort({ quantity: 1 })
            .lean();

        return NextResponse.json({
            totalRevenue,
            totalMargin,
            totalLabour,
            totalPartsRevenue,
            totalCashReceived,
            totalBankReceived,
            jobCount,
            avgTicket,
            byServiceType,
            chartData,
            lowStockThreshold,
            lowStockItems: lowStockItems.map((it: any) => ({
                _id: it._id.toString(),
                name: it.name,
                productCode: it.productCode,
                category: it.category,
                quantity: it.quantity,
            })),
            recentJobs: sales.slice(0, 15).map((r: any) => ({
                _id: r._id.toString(),
                customerName: r.customerName,
                bikeNumber: r.bikeNumber,
                serviceType: r.serviceType,
                totalAmount: r.totalAmount,
                margin: r.margin,
                date: r.date,
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
