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

/**
 * Renders the IRN as a PNG data URL. FBR's spec (DI API v1.12 §6) requires
 * QR version 2.0 (a 25x25 module grid) printed at 1.0 x 1.0 inch. At level M
 * the encoder already picks version 2 for a ~27 character IRN, so the size is
 * correct without pinning it. 300px keeps it crisp at 1 inch on a 300dpi
 * receipt printer.
 */
export async function irnQrDataUrl(invoiceNumber: string): Promise<string> {
    return QRCode.toDataURL(invoiceNumber, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 300,
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
