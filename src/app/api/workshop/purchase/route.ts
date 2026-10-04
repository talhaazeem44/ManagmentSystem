import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkshopStock, Expense } from '@/models';
import { resolveTransactionDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/** A purchase is always logged against the workshop's cash/bank, so recent ones are just
 *  WORKSHOP expenses tagged with this category — no separate collection needed. */
const PURCHASE_CATEGORY = 'Stock Purchase';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET() {
    try {
        await dbConnect();
        const purchases = await Expense.find({ deductFrom: 'WORKSHOP', category: PURCHASE_CATEGORY })
            .sort({ date: -1 })
            .limit(50)
            .lean();
        return NextResponse.json(purchases);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { name, category, quantity, costPrice, sellingPrice, paymentMode, supplier, date } = await request.json();

        const qty = Number(quantity);
        const cost = Number(costPrice);
        const selling = Number(sellingPrice);
        if (!name?.trim() || !qty || qty <= 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(selling) || selling < 0) {
            return NextResponse.json({ message: 'Enter a valid item name, quantity, cost price and selling price' }, { status: 400 });
        }

        // Buying more of something already in stock restocks it (adds to quantity, refreshes
        // prices to what was actually paid this time) instead of creating a duplicate entry —
        // matched by name since that's all a buyer gives you, case-insensitive either way.
        const existing = await WorkshopStock.findOne({ name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' } });
        const stock = existing
            ? await WorkshopStock.findByIdAndUpdate(
                existing._id,
                { $inc: { quantity: qty }, $set: { retailPrice: cost, customerPrice: selling, ...(category ? { category } : {}) } },
                { new: true }
            )
            : await WorkshopStock.create({ name: name.trim(), category: category || 'Other', retailPrice: cost, customerPrice: selling, quantity: qty });

        const mode: 'CASH' | 'BANK_TRANSFER' = paymentMode === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'CASH';
        const expense = await Expense.create({
            amount: cost * qty,
            description: `Stock purchase: ${name.trim()} x${qty}${supplier?.trim() ? ` from ${supplier.trim()}` : ''}`,
            category: PURCHASE_CATEGORY,
            deductFrom: 'WORKSHOP',
            paymentMode: mode,
            date: resolveTransactionDate(date),
        });

        return NextResponse.json({ stock, expense }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
