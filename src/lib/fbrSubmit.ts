import { FbrInvoice, type FbrSourceType } from '@/models';
import { buildPayload } from '@/lib/fbrBuild';
import { fbrMode, postInvoice, readResponse } from '@/lib/fbr';

export interface SubmitResult {
    status: 'VALID' | 'INVALID';
    invoiceNumber?: string;
    error?: string;
    alreadySubmitted?: boolean;
    record?: unknown;
}

/**
 * Build, submit and record one invoice. Idempotent: a source that already holds
 * a VALID IRN in the current mode is returned untouched rather than re-sent.
 */
export async function submitToFbr(sourceType: FbrSourceType, sourceId: string): Promise<SubmitResult> {
    const mode = fbrMode();

    const existing = await FbrInvoice.findOne({ sourceType, sourceId, mode, status: 'VALID' }).lean();
    if (existing) {
        return {
            status: 'VALID',
            invoiceNumber: existing.fbrInvoiceNumber,
            alreadySubmitted: true,
            record: existing,
        };
    }

    const { payload, localInvoiceNumber } = await buildPayload(sourceType, sourceId);
    const response = await postInvoice(payload);
    const result = readResponse(response);

    const record = await FbrInvoice.findOneAndUpdate(
        { sourceType, sourceId, mode, status: { $ne: 'VALID' } },
        {
            $set: {
                sourceType, sourceId, mode, localInvoiceNumber,
                status: result.status,
                fbrInvoiceNumber: result.invoiceNumber,
                fbrDated: response.dated,
                error: result.error,
                payload, response,
                submittedAt: new Date(),
            },
            $inc: { attempts: 1 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return { ...result, record };
}

/**
 * Fire-and-forget variant for use inside the sale-creation path: a failure to
 * reach FBR must never stop a sale from being recorded. The failed attempt is
 * still persisted so it shows up on /fbr for retry.
 */
export async function submitToFbrInBackground(sourceType: FbrSourceType, sourceId: string): Promise<void> {
    try {
        const result = await submitToFbr(sourceType, sourceId);
        if (result.status !== 'VALID') {
            console.warn(`FBR rejected ${sourceType} ${sourceId}: ${result.error}`);
        }
    } catch (error) {
        console.error(`FBR submission errored for ${sourceType} ${sourceId}:`, error);
        // Record the failure so it is visible and retryable from the FBR page.
        try {
            await FbrInvoice.updateOne(
                { sourceType, sourceId, mode: fbrMode(), status: { $ne: 'VALID' } },
                {
                    $set: {
                        sourceType, sourceId, mode: fbrMode(),
                        localInvoiceNumber: sourceId,
                        status: 'INVALID',
                        error: error instanceof Error ? error.message : String(error),
                        submittedAt: new Date(),
                    },
                    $inc: { attempts: 1 },
                },
                { upsert: true }
            );
        } catch (e) {
            console.error('Could not record FBR failure:', e);
        }
    }
}
