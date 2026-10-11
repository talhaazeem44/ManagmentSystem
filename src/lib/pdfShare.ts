/**
 * Utility functions for generating and sharing PDF receipts
 */

export interface GeneratePdfResult {
    pdf: unknown;
    blob: Blob;
    file: File;
    fileName: string;
}

/**
 * Capture an HTML element and generate a high-resolution A4 PDF.
 */
export async function generateReceiptPdf(
    element: HTMLElement,
    fileName: string
): Promise<GeneratePdfResult> {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ]);

    const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        useCORS: true,
        logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
        // Multi-page handling for long receipts
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
            position = position - pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
    }

    const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const blob = pdf.output('blob');
    const file = new File([blob], safeName, { type: 'application/pdf' });

    return { pdf, blob, file, fileName: safeName };
}

/**
 * Share a PDF file via Web Share API if supported, or automatically download it.
 */
export async function sharePdfFile(
    file: File,
    title: string,
    text: string
): Promise<{ success: boolean; mode: 'native' | 'download' | 'cancelled' }> {
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title,
                text,
            });
            return { success: true, mode: 'native' };
        } catch (err: unknown) {
            if ((err as { name?: string })?.name === 'AbortError') {
                return { success: false, mode: 'cancelled' };
            }
            console.warn('Native share failed, downloading instead:', err);
        }
    }

    // Fallback: download file directly
    downloadBlobFile(file, file.name);
    return { success: true, mode: 'download' };
}

/**
 * Trigger browser file download for a File or Blob.
 */
export function downloadBlobFile(fileOrBlob: File | Blob, fileName: string) {
    const url = URL.createObjectURL(fileOrBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Format a neat WhatsApp message for a Khata Stock Given Sale Receipt.
 */
export function formatKhataReceiptWhatsAppMessage(
    party: { name: string; mobile?: string },
    tx: {
        _id: string;
        date: string | Date;
        amount: number;
        description?: string;
        items?: Array<{ model?: string; quantity?: number; pricePerUnit?: number; engineNumber?: string }>;
    },
    balance: number,
    receiptUrl?: string
): string {
    const dateStr = new Date(tx.date).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const receiptNo = tx._id.slice(-8).toUpperCase();

    const lines = [
        `🏍️ *HONDA 3S — SALE RECEIPT*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `*Dealer / Party:* ${party.name}`,
        `*Receipt No:* #${receiptNo}`,
        `*Date:* ${dateStr}`,
        ``,
        `*Stock Delivered:*`,
    ];

    if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item, idx) => {
            const bikeDetail = item.engineNumber ? ` (${item.engineNumber})` : '';
            const qty = item.quantity || 1;
            const price = Number(item.pricePerUnit || 0);
            lines.push(
                `${idx + 1}. *${item.model || 'Bike'}*${bikeDetail}\n   Qty: ${qty} × Rs. ${price.toLocaleString()} = Rs. ${(qty * price).toLocaleString()}`
            );
        });
    } else {
        lines.push(`• ${tx.description || 'Stock Given'}`);
    }

    lines.push(``);
    lines.push(`*Total Amount:* Rs. ${tx.amount.toLocaleString()}`);
    lines.push(`*Outstanding Balance:* Rs. ${balance.toLocaleString()}`);

    if (receiptUrl) {
        lines.push(``);
        lines.push(`📄 *View Online Receipt:* ${receiptUrl}`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`*Thank you for your business!*`);

    return lines.join('\n');
}

/**
 * Open WhatsApp chat with optional pre-filled number and message.
 */
export function openWhatsAppChat(phone?: string, text?: string) {
    const encodedText = text ? encodeURIComponent(text) : '';
    if (phone) {
        let cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '92' + cleaned.slice(1);
        } else if (!cleaned.startsWith('92') && cleaned.length === 10) {
            cleaned = '92' + cleaned;
        }
        window.open(`https://wa.me/${cleaned}?text=${encodedText}`, '_blank');
    } else {
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
}
