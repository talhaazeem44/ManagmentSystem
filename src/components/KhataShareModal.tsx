'use client';

import React, { useRef, useState } from 'react';
import KhataReceiptView, {
    KhataReceiptParty,
    KhataReceiptTx,
} from './KhataReceiptView';
import {
    generateReceiptPdf,
    sharePdfFile,
    downloadBlobFile,
    formatKhataReceiptWhatsAppMessage,
    openWhatsAppChat,
} from '@/lib/pdfShare';

interface KhataShareModalProps {
    party: KhataReceiptParty;
    tx: KhataReceiptTx;
    balance: number;
    onClose: () => void;
    onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function KhataShareModal({
    party,
    tx,
    balance,
    onClose,
    onToast,
}: KhataShareModalProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const receiptNo = tx._id ? tx._id.slice(-8).toUpperCase() : 'RECEIPT';
    const fileName = `Sale-Receipt-${(party.name || 'Party').replace(/\s+/g, '_')}-${receiptNo}.pdf`;
    const receiptUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}/khata/${party._id}/receipt/${tx._id}`
            : '';

    const handleSharePDF = async () => {
        if (!receiptRef.current) return;
        setGenerating(true);
        try {
            const { file } = await generateReceiptPdf(receiptRef.current, fileName);
            const title = `Sale Receipt #${receiptNo} - ${party.name}`;
            const text = `Sale Receipt for ${party.name} · Total: Rs. ${tx.amount.toLocaleString()} · Balance: Rs. ${balance.toLocaleString()}`;

            const res = await sharePdfFile(file, title, text);
            if (res.mode === 'native') {
                onToast?.('Receipt shared successfully!', 'success');
            } else if (res.mode === 'download') {
                onToast?.('PDF downloaded! You can now send it to the dealer.', 'success');
            }
        } catch (err: unknown) {
            console.error('PDF generation error:', err);
            onToast?.('Failed to generate PDF. Please try again.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!receiptRef.current) return;
        setGenerating(true);
        try {
            const { file } = await generateReceiptPdf(receiptRef.current, fileName);
            downloadBlobFile(file, fileName);
            onToast?.(`Downloaded ${fileName}`, 'success');
        } catch (err: unknown) {
            console.error('Download error:', err);
            onToast?.('Failed to export PDF.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleWhatsAppShare = async () => {
        const msg = formatKhataReceiptWhatsAppMessage(party, tx, balance, receiptUrl);

        // Also generate and download the PDF in background so user has it ready to attach in WhatsApp
        if (receiptRef.current) {
            generateReceiptPdf(receiptRef.current, fileName)
                .then(({ file }) => downloadBlobFile(file, fileName))
                .catch(() => {});
        }

        openWhatsAppChat(party.mobile, msg);
        onToast?.('Opening WhatsApp... PDF also downloaded to attach!', 'info');
    };

    const handleCopyLink = async () => {
        if (!receiptUrl) return;
        try {
            await navigator.clipboard.writeText(receiptUrl);
            setCopied(true);
            onToast?.('Receipt link copied to clipboard!', 'success');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            onToast?.('Failed to copy link.', 'error');
        }
    };

    const handleOpenReceiptTab = () => {
        if (receiptUrl) {
            window.open(receiptUrl, '_blank');
        }
    };

    const itemsSummary = (tx.items || [])
        .map(i => `${i.quantity}x ${i.model}`)
        .join(', ') || tx.description || 'Stock Given';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                overflowY: 'auto',
            }}
            onClick={e => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    background: 'var(--color-bg-card, #ffffff)',
                    color: 'var(--color-text, #111827)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                    width: '100%',
                    maxWidth: showPreview ? '860px' : '540px',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    transition: 'max-width 0.25s ease',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--color-border, #e5e7eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>📤</span>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                                Share Sale Receipt
                            </h2>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #6b7280)' }}>
                                Receipt #{receiptNo} · {party.name}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted, #6b7280)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    {/* Summary Card */}
                    <div
                        style={{
                            background: 'var(--color-bg-elevated, #f9fafb)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.5rem',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{party.name}</span>
                            <span
                                style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    color: '#10b981',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                }}
                            >
                                Stock Given
                            </span>
                        </div>

                        {party.mobile && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: '0.25rem' }}>
                                📞 {party.mobile}
                            </div>
                        )}

                        <div style={{ fontSize: '0.825rem', color: 'var(--color-text, #374151)', margin: '0.4rem 0' }}>
                            <strong>Items:</strong> {itemsSummary}
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                                marginTop: '0.75rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px dashed var(--color-border, #e5e7eb)',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #6b7280)', textTransform: 'uppercase', fontWeight: 600 }}>
                                    Receipt Amount
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary, #ef4444)' }}>
                                    Rs. {tx.amount.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #6b7280)', textTransform: 'uppercase', fontWeight: 600 }}>
                                    Remaining Balance
                                </div>
                                <div
                                    style={{
                                        fontSize: '1.1rem',
                                        fontWeight: 800,
                                        color: balance > 0 ? '#f59e0b' : '#10b981',
                                    }}
                                >
                                    Rs. {balance.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Primary Share PDF Button */}
                        <button
                            onClick={handleSharePDF}
                            disabled={generating}
                            className="btn"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.85rem 1.25rem',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                            }}
                        >
                            {generating ? '⏳ Generating PDF Receipt...' : '📲 Share PDF Receipt'}
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {/* WhatsApp Button */}
                            <button
                                onClick={handleWhatsAppShare}
                                className="btn"
                                style={{
                                    background: '#25D366',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.7rem 1rem',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    cursor: 'pointer',
                                }}
                            >
                                💬 WhatsApp
                            </button>

                            {/* Download PDF Button */}
                            <button
                                onClick={handleDownloadPDF}
                                disabled={generating}
                                className="btn btn-secondary"
                                style={{
                                    padding: '0.7rem 1rem',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                }}
                            >
                                📄 Download PDF
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {/* Copy Link Button */}
                            <button
                                onClick={handleCopyLink}
                                className="btn btn-secondary"
                                style={{
                                    padding: '0.6rem 0.8rem',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem',
                                }}
                            >
                                {copied ? '✅ Link Copied!' : '📋 Copy Link'}
                            </button>

                            {/* View / Print Full Page */}
                            <button
                                onClick={handleOpenReceiptTab}
                                className="btn btn-secondary"
                                style={{
                                    padding: '0.6rem 0.8rem',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem',
                                }}
                            >
                                🧾 Open Full Page
                            </button>
                        </div>
                    </div>

                    {/* Toggle Preview */}
                    <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-primary, #ef4444)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            {showPreview ? '▲ Hide Receipt Preview' : '▼ Preview Receipt Document'}
                        </button>
                    </div>

                    {/* Preview inside modal if toggled */}
                    {showPreview && (
                        <div
                            style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                background: '#f3f4f6',
                                borderRadius: '12px',
                                maxHeight: '420px',
                                overflowY: 'auto',
                                border: '1px solid var(--color-border, #e5e7eb)',
                            }}
                        >
                            <KhataReceiptView party={party} tx={tx} balance={balance} />
                        </div>
                    )}
                </div>
            </div>

            {/* Offscreen receipt DOM node for html2canvas to capture at fixed 800px width */}
            <div
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: 0,
                    width: '800px',
                    background: '#ffffff',
                    pointerEvents: 'none',
                }}
                aria-hidden="true"
            >
                <KhataReceiptView ref={receiptRef} party={party} tx={tx} balance={balance} />
            </div>
        </div>
    );
}
