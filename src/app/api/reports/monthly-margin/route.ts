import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, AdvanceBooking, Expense, KhataParty, UsedBike, ServiceSale } from '@/models';
import { BIKE_STANDARD_PRICES, BIKE_UNIT_MARGINS } from '@/lib/constants';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

// Mirrors the local calcAdvanceMargin in /api/reports — kept in sync deliberately rather than
// imported, since that file's version is scoped to a date-range request, not full history.
const calcAdvanceBikeProfit = (booking: any) => {
    const model = booking.bikeModel || '';
    const standardPrice = BIKE_STANDARD_PRICES[model] || 0;
    const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
    const totalPrice = Math.max(Number(booking.totalPrice || 0), Number(booking.advancePaid || 0));
    const extraCash = Math.max(0, totalPrice - standardPrice);
    return baseMargin + extraCash;
};

// Mirrors calcSaleMargin's bikeProfit half in /api/reports (registration profit excluded on
// purpose — Collect Margin doesn't count it either, so this stays reconcilable with that number).
const calcSaleBikeProfit = (sale: any) => {
    const model = sale.bikeId?.model || '';
    const standardPrice = BIKE_STANDARD_PRICES[model] || Number(sale.price || 0);
    const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
    const totalReceived = sale.paymentMode === 'CREDIT'
        ? Number(sale.receivedCash || 0) + Number(sale.bankTransferAmount || 0) + Number(sale.balance || 0)
        : (Number(sale.receivedCash || 0) + Number(sale.bankTransferAmount || 0)) || Number(sale.price || 0);
    return baseMargin + (totalReceived - standardPrice);
};

const monthKey = (d: Date | string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export async function GET() {
    try {
        await dbConnect();

        const [sales, advanceBookings, khataParties, usedBikes, expenses, services] = await Promise.all([
            Sale.find().populate('bikeId').lean(),
            AdvanceBooking.find().lean(),
            KhataParty.find().lean(),
            UsedBike.find({ status: 'SOLD' }).lean(),
            Expense.find().lean(),
            ServiceSale.find().lean(),
        ]);

        const months = new Map<string, { bikeMargin: number; workshopMargin: number; marginExpense: number; workshopExpense: number; salesCount: number; jobCount: number }>();
        const ensure = (key: string) => {
            if (!months.has(key)) months.set(key, { bikeMargin: 0, workshopMargin: 0, marginExpense: 0, workshopExpense: 0, salesCount: 0, jobCount: 0 });
            return months.get(key)!;
        };

        for (const sale of sales as any[]) {
            if (!sale.saleDate) continue;
            const m = ensure(monthKey(sale.saleDate));
            m.bikeMargin += calcSaleBikeProfit(sale);
            m.salesCount += 1;
        }
        for (const b of advanceBookings as any[]) {
            if (!b.date) continue;
            ensure(monthKey(b.date)).bikeMargin += calcAdvanceBikeProfit(b);
        }
        for (const party of khataParties as any[]) {
            for (const t of party.transactions || []) {
                if (t.type !== 'STOCK_GIVEN' || !(t.margin || 0) || !t.date) continue;
                ensure(monthKey(t.date)).bikeMargin += Number(t.margin || 0);
            }
        }
        for (const u of usedBikes as any[]) {
            if (!u.soldDate) continue;
            ensure(monthKey(u.soldDate)).bikeMargin += Number(u.soldPrice || 0) - Number(u.purchasePrice || 0);
        }
        for (const e of expenses as any[]) {
            if (!e.date) continue;
            const m = ensure(monthKey(e.date));
            if (e.deductFrom === 'MARGIN') m.marginExpense += Number(e.amount || 0);
            else if (e.deductFrom === 'WORKSHOP') m.workshopExpense += Number(e.amount || 0);
        }
        for (const s of services as any[]) {
            if (!s.date) continue;
            const m = ensure(monthKey(s.date));
            m.workshopMargin += Number(s.margin || 0);
            m.jobCount += 1;
        }

        const result = Array.from(months.entries())
            .map(([month, v]) => ({
                month,
                bikeMargin: v.bikeMargin,
                workshopMargin: v.workshopMargin,
                expenses: v.marginExpense + v.workshopExpense,
                netMargin: v.bikeMargin + v.workshopMargin - v.marginExpense - v.workshopExpense,
                salesCount: v.salesCount,
                jobCount: v.jobCount,
            }))
            .sort((a, b) => b.month.localeCompare(a.month));

        const allTime = result.reduce((acc, r) => ({
            bikeMargin: acc.bikeMargin + r.bikeMargin,
            workshopMargin: acc.workshopMargin + r.workshopMargin,
            expenses: acc.expenses + r.expenses,
            netMargin: acc.netMargin + r.netMargin,
        }), { bikeMargin: 0, workshopMargin: 0, expenses: 0, netMargin: 0 });

        return NextResponse.json({ months: result, allTime });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
