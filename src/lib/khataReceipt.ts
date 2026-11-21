import { KhataParty, Counter } from '@/models';

/**
 * Returns the next global auto-incrementing sequential receipt number for khata sales.
 */
export async function getNextKhataReceiptNumber(): Promise<number> {
    // First make sure any legacy unnumbered transactions are assigned numbers
    await ensureKhataReceiptNumbers();

    const counter = await Counter.findByIdAndUpdate(
        'khataReceipt',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}

/**
 * Ensures all existing STOCK_GIVEN transactions across all parties have sequential
 * receipt numbers (1, 2, 3...) and the 'khataReceipt' counter matches the highest number.
 */
export async function ensureKhataReceiptNumbers(): Promise<void> {
    // Check if there are any STOCK_GIVEN transactions missing receiptNumber
    const partiesWithUnnumbered = await KhataParty.find({
        transactions: {
            $elemMatch: {
                type: 'STOCK_GIVEN',
                receiptNumber: { $exists: false },
            },
        },
    }).lean();

    if (!partiesWithUnnumbered || partiesWithUnnumbered.length === 0) {
        return;
    }

    // Get current counter sequence or find the current highest receiptNumber
    const counter = await Counter.findById('khataReceipt');
    let currentSeq = counter ? counter.seq : 0;

    // If counter is 0, find any highest existing receiptNumber across all parties
    if (currentSeq === 0) {
        const allParties = await KhataParty.find({}, { 'transactions.receiptNumber': 1 }).lean();
        for (const p of allParties) {
            for (const t of (p as any).transactions || []) {
                if (typeof t.receiptNumber === 'number' && t.receiptNumber > currentSeq) {
                    currentSeq = t.receiptNumber;
                }
            }
        }
    }

    // Gather all unnumbered STOCK_GIVEN transactions across parties
    interface UnnumberedTx {
        partyId: string;
        txId: string;
        date: Date;
    }

    const unnumbered: UnnumberedTx[] = [];
    for (const p of partiesWithUnnumbered) {
        for (const t of (p as any).transactions || []) {
            if (t.type === 'STOCK_GIVEN' && (t.receiptNumber === undefined || t.receiptNumber === null)) {
                unnumbered.push({
                    partyId: p._id.toString(),
                    txId: t._id.toString(),
                    date: new Date(t.date || 0),
                });
            }
        }
    }

    // Sort chronologically so older transactions get lower numbers
    unnumbered.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Assign sequential numbers
    for (const item of unnumbered) {
        currentSeq += 1;
        await KhataParty.updateOne(
            { _id: item.partyId, 'transactions._id': item.txId },
            { $set: { 'transactions.$.receiptNumber': currentSeq } }
        );
    }

    // Update Counter
    await Counter.findByIdAndUpdate(
        'khataReceipt',
        { seq: currentSeq },
        { upsert: true }
    );
}
