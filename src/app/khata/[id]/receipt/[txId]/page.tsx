'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import KhataReceiptView, {
    KhataReceiptParty,
    KhataReceiptTx,
} from '@/components/KhataReceiptView';
import {
    generateReceiptPdf,
    sharePdfFile,
    downloadBlobFile,
    formatKhataReceiptWhatsAppMessage,
    openWhatsAppChat,
} from '@/lib/pdfShare';

export default function KhataStockReceiptPage() {
    const params = useParams();
    const { toasts, showToast, removeToast } = useToast();
    const [party, setParty] = useState<(KhataReceiptParty & { transactions: KhataReceiptTx[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const id = params.id as string;
        if (!id) return;
        fetch(`/api/khata/${id}`)
            .then(r => (r.ok ? r.json() : null))
            .then(setParty)
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading)
        return (
            <DashboardLayout>
                <Loader size={160} fullPage />
            </DashboardLayout>
        );

    const tx = party?.transactions.find(t => t._id === params.txId);

    if (!party || !tx || tx.type !== 'STOCK_GIVEN') {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Receipt not found.
                </div>
            </DashboardLayout>
        );
    }

    // Running balance across all transactions up to and including this one, chronologically
    const sorted = [...party.transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let balance = 0;
    for (const t of sorted) {
        balance += t.type === 'STOCK_GIVEN' ? t.amount : -t.amount;
        if (t._id === tx._id) break;
    }

    const receiptNo = tx._id ? tx._id.slice(-8).toUpperCase() : 'RECEIPT';
    const fileName = `Sale-Receipt-${(party.name || 'Party').replace(/\s+/g, '_')}-${receiptNo}.pdf`;
    const receiptUrl = typeof window !== 'undefined' ? window.location.href : '';

    const handleSharePDF = async () => {
        if (!receiptRef.current) return;
        setSharing(true);
        try {
            const { file } = await generateReceiptPdf(receiptRef.current, fileName);
            const title = `Sale Receipt #${receiptNo} - ${party.name}`;
            const text = `Sale Receipt for ${party.name} · Total: Rs. ${tx.amount.toLocaleString()} · Balance: Rs. ${balance.toLocaleString()}`;

            const res = await sharePdfFile(file, title, text);
            if (res.mode === 'native') {
                showToast('Receipt shared successfully!', 'success');
            } else if (res.mode === 'download') {
                showToast('PDF downloaded! You can now send it to the dealer.', 'success');
            }
        } catch (err) {
            console.error('Share error:', err);
            showToast('Failed to generate PDF for sharing.', 'error');
        } finally {
            setSharing(false);
        }
    };

    const handleExportPDF = async () => {
        if (!receiptRef.current) return;
        setExporting(true);
        try {
            const { file } = await generateReceiptPdf(receiptRef.current, fileName);
            downloadBlobFile(file, fileName);
            showToast(`Downloaded ${fileName}`, 'success');
        } catch (err) {
            console.error('Export error:', err);
            showToast('Failed to export PDF.', 'error');
        } finally {
            setExporting(false);
        }
    };

    const handleWhatsApp = () => {
        const msg = formatKhataReceiptWhatsAppMessage(party, tx, balance, receiptUrl);
        if (receiptRef.current) {
            generateReceiptPdf(receiptRef.current, fileName)
                .then(({ file }) => downloadBlobFile(file, fileName))
                .catch(() => {});
        }
        openWhatsAppChat(party.mobile, msg);
        showToast('Opening WhatsApp... PDF also downloaded to attach!', 'info');
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                {/* ── Top Bar ── */}
                <div
                    className="no-print"
                    style={{
                        marginBottom: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                    }}
                >
                    <div>
                        <a
                            href={`/khata/${party._id}`}
                            style={{
                                color: 'var(--color-text-muted)',
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                                display: 'inline-block',
                                marginBottom: '0.25rem',
                            }}
                        >
                            ← Back to {party.name} Khata
                        </a>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                            Sale Receipt
                        </h1>
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleSharePDF}
                            disabled={sharing || exporting}
                            className="btn"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontWeight: 700,
                            }}
                        >
                            {sharing ? '⏳ Generating...' : '📲 Share PDF'}
                        </button>

                        <button
                            onClick={handleExportPDF}
                            disabled={exporting || sharing}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            {exporting ? '⏳ Generating...' : '📄 Export PDF'}
                        </button>

                        <button
                            onClick={handleWhatsApp}
                            className="btn"
                            style={{
                                background: '#25D366',
                                color: '#ffffff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontWeight: 600,
                            }}
                        >
                            💬 WhatsApp
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            🖨️ Print Receipt
                        </button>
                    </div>
                </div>

                {/* ── Receipt View ── */}
                <div style={{ margin: '0 auto', maxWidth: '780px' }}>
                    <KhataReceiptView
                        ref={receiptRef}
                        party={party}
                        tx={tx as unknown as KhataReceiptTx}
                        balance={balance}
                    />
                </div>
            </div>

            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
