import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale, AdvanceBooking, KhataParty } from '@/models';

export async function GET() {
    try {
        await dbConnect();

        // Three sources of "a bike left the shop" — none of the other two create a Sale record
        // (would double-count margin), so a model-wise breakdown built from Sale alone silently
        // dropped every bike delivered via an Advance Booking or given to a Khata dealer.
        const [sales, deliveredBookings, khataParties] = await Promise.all([
            Sale.find().populate('bikeId').lean(),
            AdvanceBooking.find({ status: 'DELIVERED' }).populate('bikeId').lean(),
            KhataParty.find({}).lean(),
        ]);

        // Build { 'Jan 2026': { CG125: 3, CD70: 1, ... }, ... }
        const monthly: Record<string, Record<string, number>> = {};
        const modelSet = new Set<string>();

        const addUnit = (model: string, date: Date, count: number) => {
            const key = date.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthly[key]) monthly[key] = { _sortKey: sortKey as any };
            monthly[key][model] = (monthly[key][model] || 0) + count;
            modelSet.add(model);
        };

        for (const sale of sales as any[]) {
            addUnit(sale.bikeId?.model || 'Unknown', new Date(sale.saleDate), 1);
        }

        for (const booking of deliveredBookings as any[]) {
            const model = (booking.bikeId as any)?.model || booking.bikeModel || 'Unknown';
            // deliveredAt is when the bike actually changed hands; fall back to the booking's own
            // date for older records saved before deliveredAt existed.
            addUnit(model, new Date(booking.deliveredAt || booking.date), 1);
        }

        for (const party of khataParties as any[]) {
            for (const tx of party.transactions || []) {
                if (tx.type !== 'STOCK_GIVEN') continue;
                for (const item of tx.items || []) {
                    addUnit(item.model || 'Unknown', new Date(tx.date), Number(item.quantity) || 0);
                }
            }
        }

        // Sort months chronologically
        const rows = Object.entries(monthly)
            .sort(([, a], [, b]) => String((a as any)._sortKey).localeCompare(String((b as any)._sortKey)))
            .map(([month, counts]) => {
                const { _sortKey, ...models } = counts as any;
                const total = Object.values(models as Record<string, number>).reduce((s, v) => s + v, 0);
                return { month, models: models as Record<string, number>, total };
            });

        const models = Array.from(modelSet).sort();

        return NextResponse.json({ rows, models });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
