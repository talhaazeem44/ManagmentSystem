import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { FbrInvoice, Sale, ServiceSale } from '@/models';
import { fbrMode } from '@/lib/fbr';

/** GET /api/fbr/status — configuration + how much is still un-reported. */
export async function GET() {
    try {
        await dbConnect();
        const mode = fbrMode();

        const [counts, sales, serviceSales, submitted] = await Promise.all([
            FbrInvoice.aggregate([{ $match: { mode } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
            Sale.countDocuments({}),
            ServiceSale.countDocuments({}),
            FbrInvoice.countDocuments({ mode, status: 'VALID' }),
        ]);

        const byStatus = Object.fromEntries(counts.map((c: { _id: string; n: number }) => [c._id, c.n]));

        return NextResponse.json({
            mode,
            configured: {
                token: Boolean(mode === 'production' ? process.env.FBR_PROD_TOKEN : process.env.FBR_SANDBOX_TOKEN),
                sellerNTNCNIC: Boolean(process.env.FBR_SELLER_NTNCNIC),
                sellerBusinessName: Boolean(process.env.FBR_SELLER_BUSINESS_NAME),
                sellerAddress: Boolean(process.env.FBR_SELLER_ADDRESS),
            },
            counts: {
                valid: byStatus.VALID || 0,
                invalid: byStatus.INVALID || 0,
                pending: byStatus.PENDING || 0,
                totalDocuments: sales + serviceSales,
                notReported: sales + serviceSales - submitted,
            },
        });
    } catch (error) {
        return NextResponse.json({ message: 'Failed to read FBR status', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
