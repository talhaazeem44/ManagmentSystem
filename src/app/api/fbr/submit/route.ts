import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { buildPayload } from '@/lib/fbrBuild';
import { readResponse, validateInvoice } from '@/lib/fbr';
import { submitToFbr } from '@/lib/fbrSubmit';

/**
 * POST /api/fbr/submit
 * body: { sourceType: 'SALE' | 'SERVICE_SALE', sourceId, validateOnly?: boolean }
 *
 * validateOnly runs FBR's validator without creating an IRN — useful for a
 * dry run before going live.
 */
export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const { sourceType, sourceId, validateOnly } = await request.json();

        if (sourceType !== 'SALE' && sourceType !== 'SERVICE_SALE') {
            return NextResponse.json({ message: 'sourceType must be SALE or SERVICE_SALE' }, { status: 400 });
        }
        if (!sourceId) {
            return NextResponse.json({ message: 'sourceId is required' }, { status: 400 });
        }

        if (validateOnly) {
            const { payload } = await buildPayload(sourceType, sourceId);
            const response = await validateInvoice(payload);
            return NextResponse.json({ validateOnly: true, payload, response, ...readResponse(response) });
        }

        const result = await submitToFbr(sourceType, sourceId);
        return NextResponse.json(result, { status: result.status === 'VALID' ? 201 : 422 });
    } catch (error) {
        console.error('FBR submit failed:', error);
        return NextResponse.json(
            { message: 'FBR submission failed', error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
