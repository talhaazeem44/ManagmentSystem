import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ServiceSale, Expense } from '@/models';

// This GET handler takes no request-specific input, which Next.js would otherwise treat as
// static and cache — serving a stale value to some clients even after the DB changes.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        const [marginByMonth, expenseByMonth] = await Promise.all([
            ServiceSale.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                        grossMargin: { $sum: '$margin' },
                        revenue: { $sum: '$totalAmount' },
                        jobCount: { $sum: 1 },
                    },
                },
            ]),
            Expense.aggregate([
                { $match: { deductFrom: 'WORKSHOP' } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                        expenseTotal: { $sum: '$amount' },
                    },
                },
            ]),
        ]);

        const months = new Map<string, { month: string; grossMargin: number; revenue: number; jobCount: number; expenseTotal: number }>();
        for (const m of marginByMonth as any[]) {
            months.set(m._id, { month: m._id, grossMargin: m.grossMargin, revenue: m.revenue, jobCount: m.jobCount, expenseTotal: 0 });
        }
        for (const e of expenseByMonth as any[]) {
            const existing = months.get(e._id);
            if (existing) existing.expenseTotal = e.expenseTotal;
            else months.set(e._id, { month: e._id, grossMargin: 0, revenue: 0, jobCount: 0, expenseTotal: e.expenseTotal });
        }

        const report = Array.from(months.values())
            .map(m => ({ ...m, netMargin: m.grossMargin - m.expenseTotal }))
            .sort((a, b) => b.month.localeCompare(a.month));

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
