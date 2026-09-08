'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';

interface FbrInvoiceRow {
    _id: string;
    sourceType: 'SALE' | 'SERVICE_SALE';
    sourceId: string;
    localInvoiceNumber: string;
    mode: string;
    status: 'PENDING' | 'VALID' | 'INVALID';
    fbrInvoiceNumber?: string;
    error?: string;
    attempts: number;
    submittedAt?: string;
}

interface FbrStatus {
    mode: string;
    configured: Record<string, boolean>;
    counts: {
        valid: number;
        invalid: number;
        pending: number;
        totalDocuments: number;
        notReported: number;
    };
}

const STATUS_COLOR: Record<string, string> = {
    VALID: '#16a34a',
    INVALID: '#dc2626',
    PENDING: '#ca8a04',
};

export default function FbrPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [status, setStatus] = useState<FbrStatus | null>(null);
    const [invoices, setInvoices] = useState<FbrInvoiceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const qs = filter === 'ALL' ? '' : `?status=${filter}`;
            const [s, list] = await Promise.all([
                fetch('/api/fbr/status').then(r => r.json()),
                fetch(`/api/fbr/invoices${qs}`).then(r => r.json()),
            ]);
            setStatus(s);
            setInvoices(Array.isArray(list) ? list : []);
        } catch {
            showToast('Could not load FBR status', 'error');
        } finally {
            setLoading(false);
        }
    }, [filter, showToast]);

    useEffect(() => { load(); }, [load]);

    const retry = async (row: FbrInvoiceRow) => {
        setBusyId(row._id);
        try {
            const res = await fetch('/api/fbr/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceType: row.sourceType, sourceId: row.sourceId }),
            });
            const data = await res.json();
            if (data.status === 'VALID') {
                showToast(`Accepted by FBR — IRN ${data.invoiceNumber}`, 'success');
            } else {
                showToast(data.error || data.message || 'FBR rejected the invoice', 'error');
            }
            await load();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Submission failed', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const missing = status
        ? Object.entries(status.configured).filter(([, ok]) => !ok).map(([k]) => k)
        : [];

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>FBR Digital Invoicing</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        Invoices reported to FBR&apos;s DI system
                        {status && <> — running in <strong>{status.mode}</strong> mode</>}
                    </p>
                </div>

                {missing.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1.5px solid #dc2626', background: 'rgba(220,38,38,0.06)' }}>
                        <strong style={{ color: '#dc2626' }}>Configuration incomplete.</strong>{' '}
                        Missing in <code>.env</code>: {missing.join(', ')}. Invoices cannot be submitted until these are set.
                    </div>
                )}

                {loading ? <Loader /> : (
                    <>
                        {status && (
                            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                                {[
                                    { label: 'Accepted by FBR', value: status.counts.valid, color: STATUS_COLOR.VALID },
                                    { label: 'Rejected', value: status.counts.invalid, color: STATUS_COLOR.INVALID },
                                    { label: 'Not yet reported', value: status.counts.notReported, color: '#ca8a04' },
                                    { label: 'Total documents', value: status.counts.totalDocuments, color: 'var(--color-text)' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="card" style={{ padding: '1.1rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{label}</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            {(['ALL', 'VALID', 'INVALID'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        border: `1.5px solid ${filter === f ? '#2563eb' : 'var(--color-border)'}`,
                                        background: filter === f ? 'rgba(37,99,235,0.1)' : 'var(--color-bg-elevated)',
                                        fontWeight: filter === f ? 700 : 400,
                                    }}
                                >
                                    {f === 'ALL' ? 'All' : f === 'VALID' ? 'Accepted' : 'Rejected'}
                                </button>
                            ))}
                        </div>

                        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                                        {['Local #', 'Type', 'Status', 'FBR IRN', 'Attempts', 'Submitted', ''].map(h => (
                                            <th key={h} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                No invoices reported yet.
                                            </td>
                                        </tr>
                                    )}
                                    {invoices.map(row => (
                                        <tr key={row._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.localInvoiceNumber}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{row.sourceType === 'SALE' ? 'Bike sale' : 'Workshop'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ color: STATUS_COLOR[row.status], fontWeight: 700 }}>{row.status}</span>
                                                {row.error && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', maxWidth: '320px' }}>{row.error}</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.fbrInvoiceNumber || '—'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>{row.attempts}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                                                {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                {row.status !== 'VALID' && (
                                                    <button
                                                        disabled={busyId === row._id}
                                                        onClick={() => retry(row)}
                                                        style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--color-border)' }}
                                                    >
                                                        {busyId === row._id ? '…' : 'Retry'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
