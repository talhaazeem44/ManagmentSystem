import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Sale } from '@/models';

export async function GET() {
    try {
        await dbConnect();

        const sales = await Sale.find().populate('bikeId').lean();

        // Build { 'Jan 2026': { CG125: 3, CD70: 1, ... }, ... }
        const monthly: Record<string, Record<string, number>> = {};
        const modelSet = new Set<string>();

        for (const sale of sales as any[]) {
            const model = sale.bikeId?.model || 'Unknown';
            const date = new Date(sale.saleDate);
            const key = date.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
            // Store sortable value alongside
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthly[key]) monthly[key] = { _sortKey: sortKey as any };
            monthly[key][model] = (monthly[key][model] || 0) + 1;
            modelSet.add(model);
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
