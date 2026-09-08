import QRCode from 'qrcode';
import { FbrInvoice, type FbrSourceType } from '@/models';
import { fbrMode } from '@/lib/fbr';

/**
 * The FBR stamp that must appear on a printed invoice: the IRN in text plus a
 * QR code encoding it. FBR requires a 7x7mm QR carrying the invoice number, so
 * the image is generated from the IRN exactly as FBR returned it.
 */
export interface FbrStamp {
    invoiceNumber: string;
    dated?: string;
    mode: 'sandbox' | 'production';
    qrDataUrl: string;
}

/** Renders the IRN as a PNG data URL sized for a 7x7mm print at ~300dpi. */
export async function irnQrDataUrl(invoiceNumber: string): Promise<string> {
    return QRCode.toDataURL(invoiceNumber, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
        color: { dark: '#000000', light: '#ffffff' },
    });
}

/**
 * The FBR stamp for one source document, or null when it has no valid IRN yet
 * (never submitted, rejected, or submitted only in the other mode) — in which
 * case the receipt simply prints without a QR.
 */
export async function getFbrStamp(sourceType: FbrSourceType, sourceId: string): Promise<FbrStamp | null> {
    const mode = fbrMode();
    const record = await FbrInvoice.findOne({ sourceType, sourceId, mode, status: 'VALID' })
        .select('fbrInvoiceNumber fbrDated')
        .lean();

    if (!record?.fbrInvoiceNumber) return null;

    return {
        invoiceNumber: record.fbrInvoiceNumber,
        dated: record.fbrDated,
        mode,
        qrDataUrl: await irnQrDataUrl(record.fbrInvoiceNumber),
    };
}
