'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import Loader from '@/components/Loader';

interface Sale {
    id: string;
    _id: string;
    saleDate: string;
    price: number;
    registrationCost: number | null;
    paymentMode: string;
    receiptNumber: string | null;
    receivedCash: number;
    bankTransferAmount: number;
    balance: number;
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder: { doNumber: string };
    };
    customer: { name: string; cnic: string; mobile: string | null };
}

interface EditState {
    price: string;
    receivedCash: string;
    bankTransferAmount: string;
    registrationCost: string;
    balance: string;
    paymentMode: string;
}

const thS: React.CSSProperties = {
    padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700,
    fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.04em', borderBottom: '2px solid var(--color-border)',
    whiteSpace: 'nowrap', background: 'var(--color-bg-elevated)',
};
const tdS: React.CSSProperties = { padding: '0.4rem 0.6rem', fontSize: '0.82rem', verticalAlign: 'middle', whiteSpace: 'nowrap' };

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState | null>(null);

    // filters
    const [doFilter, setDoFilter] = useState('ALL');
    const [paymentFilter, setPaymentFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 25;

    useEffect(() => { fetchSales(); }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sales');
            if (res.ok) setSales(await res.json());
        } finally { setLoading(false); }
    };

    const startEdit = (sale: Sale) => {
        setEditId(sale._id);
        setEditState({
            price: String(sale.price),
            receivedCash: String(sale.receivedCash ?? 0),
            bankTransferAmount: String(sale.bankTransferAmount ?? 0),
            registrationCost: String(sale.registrationCost ?? 0),
            balance: String(sale.balance ?? 0),
            paymentMode: sale.paymentMode,
        });
    };

    const cancelEdit = () => { setEditId(null); setEditState(null); };

    const saveEdit = async (id: string) => {
        if (!editState) return;
        setSaving(id);
        try {
            const res = await fetch(`/api/sales/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: parseFloat(editState.price) || 0,
                    receivedCash: parseFloat(editState.receivedCash) || 0,
                    bankTransferAmount: parseFloat(editState.bankTransferAmount) || 0,
                    registrationCost: parseFloat(editState.registrationCost) || 0,
                    balance: parseFloat(editState.balance) || 0,
                    paymentMode: editState.paymentMode,
                }),
            });
            if (res.ok) { await fetchSales(); cancelEdit(); }
        } finally { setSaving(null); }
    };

    const uniqueDOs = Array.from(new Set(sales.map(s => s.bike?.deliveryOrder?.doNumber).filter(Boolean)));
    const uniqueModes = Array.from(new Set(sales.map(s => s.paymentMode)));

    const filtered = sales.filter(s => {
        if (doFilter !== 'ALL' && s.bike?.deliveryOrder?.doNumber !== doFilter) return false;
        if (paymentFilter !== 'ALL' && s.paymentMode !== paymentFilter) return false;
        if (startDate && new Date(s.saleDate) < new Date(startDate)) return false;
        if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (new Date(s.saleDate) > e) return false; }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!s.customer?.name?.toLowerCase().includes(q) &&
                !s.customer?.cnic?.toLowerCase().includes(q) &&
                !s.bike?.model?.toLowerCase().includes(q) &&
                !s.bike?.engineNumber?.toLowerCase().includes(q) &&
                !s.bike?.chassisNumber?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const totalRevenue = filtered.reduce((sum, s) => sum + Number(s.price), 0);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const editInput = (field: keyof EditState, width = '80px') => (
        <input
            type={field === 'paymentMode' ? 'text' : 'number'}
            value={editState?.[field] ?? ''}
            onChange={e => setEditState(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
            style={{ width, padding: '0.2rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-primary)', borderRadius: '4px', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
    );

    const modeSelect = () => (
        <select value={editState?.paymentMode ?? ''} onChange={e => setEditState(prev => prev ? { ...prev, paymentMode: e.target.value } : prev)}
            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--color-primary)', borderRadius: '4px', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {['CASH','CREDIT','BANK','LEASE','ONLINE'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
    );

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Sales History</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{filtered.length} of {sales.length} records · Rs. {totalRevenue.toLocaleString()}</p>
                    </div>
                    <Link href="/sales/new" className="btn btn-success" style={{ fontSize: '0.85rem' }}>➕ New Sale</Link>
                </div>

                {/* Filters */}
                <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input type="text" className="input" placeholder="Name / CNIC / Model / Engine / Chassis"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        <select className="select" value={doFilter} onChange={e => setDoFilter(e.target.value)}>
                            <option value="ALL">All DOs</option>
                            {uniqueDOs.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                            <option value="ALL">All Payment Modes</option>
                            {uniqueModes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }}
                            onClick={() => { setDoFilter('ALL'); setPaymentFilter('ALL'); setSearchQuery(''); setStartDate(''); setEndDate(''); setPage(1); }}>
                            🔄 Clear
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: '0' }}>
                    {loading ? (
                        <Loader size={160} text="Loading sales..." />
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No sales found</div>
                    ) : (
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                            <table style={{ width: 'max-content', minWidth: '100%', maxWidth: 'none', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['#','Date','Rcpt','Customer','CNIC','Mobile','Model','Color','Engine No','Chassis No','DO','Mode','Price','Cash Rcvd','Bank Xfer','Reg','Balance','Actions'].map(h => (
                                            <th key={h} style={thS}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((sale, idx) => {
                                        const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                                        const isEditing = editId === sale._id;
                                        const rowBg = idx % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)';
                                        return (
                                            <tr key={sale._id} style={{ borderBottom: '1px solid var(--color-border)', background: isEditing ? 'rgba(59,130,246,0.05)' : rowBg }}>
                                                <td style={{ ...tdS, color: 'var(--color-text-muted)', fontWeight: 600 }}>{rowNum}</td>
                                                <td style={tdS}>{new Date(sale.saleDate).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'2-digit' })}</td>
                                                <td style={{ ...tdS, color: 'var(--color-text-muted)' }}>{sale.receiptNumber ?? '—'}</td>
                                                <td style={{ ...tdS, fontWeight: 600, minWidth: '120px' }}>{sale.customer?.name ?? '—'}</td>
                                                <td style={{ ...tdS, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{sale.customer?.cnic ?? '—'}</td>
                                                <td style={{ ...tdS, color: 'var(--color-text-muted)' }}>{sale.customer?.mobile ?? '—'}</td>
                                                <td style={{ ...tdS, fontWeight: 600 }}>{sale.bike?.model ?? '—'}</td>
                                                <td style={tdS}>{sale.bike?.color ?? '—'}</td>
                                                <td style={{ ...tdS, fontSize: '0.75rem', fontFamily: 'monospace' }}>{sale.bike?.engineNumber ?? '—'}</td>
                                                <td style={{ ...tdS, fontSize: '0.75rem', fontFamily: 'monospace' }}>{sale.bike?.chassisNumber ?? '—'}</td>
                                                <td style={{ ...tdS, color: 'var(--color-text-muted)' }}>{sale.bike?.deliveryOrder?.doNumber ?? '—'}</td>

                                                {/* Editable fields */}
                                                <td style={tdS}>{isEditing ? modeSelect() : (
                                                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700,
                                                        background: sale.paymentMode === 'CREDIT' ? 'rgba(239,68,68,0.12)' : sale.paymentMode === 'CASH' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                                                        color: sale.paymentMode === 'CREDIT' ? '#ef4444' : sale.paymentMode === 'CASH' ? '#10b981' : '#3b82f6' }}>
                                                        {sale.paymentMode}
                                                    </span>
                                                )}</td>
                                                <td style={{ ...tdS, fontWeight: 700, color: 'var(--color-success)' }}>{isEditing ? editInput('price', '90px') : `Rs. ${Number(sale.price).toLocaleString()}`}</td>
                                                <td style={{ ...tdS, color: '#10b981' }}>{isEditing ? editInput('receivedCash', '90px') : `Rs. ${Number(sale.receivedCash ?? 0).toLocaleString()}`}</td>
                                                <td style={{ ...tdS, color: '#3b82f6' }}>{isEditing ? editInput('bankTransferAmount', '90px') : (sale.bankTransferAmount > 0 ? `Rs. ${Number(sale.bankTransferAmount).toLocaleString()}` : '—')}</td>
                                                <td style={{ ...tdS, color: '#8b5cf6' }}>{isEditing ? editInput('registrationCost', '80px') : (sale.registrationCost ? `Rs. ${Number(sale.registrationCost).toLocaleString()}` : '—')}</td>
                                                <td style={{ ...tdS, color: (sale.balance ?? 0) > 0 ? '#ef4444' : 'var(--color-text-muted)' }}>{isEditing ? editInput('balance', '80px') : ((sale.balance ?? 0) > 0 ? `Rs. ${Number(sale.balance).toLocaleString()}` : '—')}</td>

                                                <td style={{ ...tdS, minWidth: '110px' }}>
                                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                        {isEditing ? (
                                                            <>
                                                                <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                                                    disabled={saving === sale._id} onClick={() => saveEdit(sale._id)}>
                                                                    {saving === sale._id ? '⏳' : '💾 Save'}
                                                                </button>
                                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                                                    onClick={cancelEdit}>✕</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                                                    onClick={() => startEdit(sale)}>✏️ Edit</button>
                                                                <Link href={`/sales/${sale._id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}>🖨️</Link>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Page {page} of {totalPages} · {filtered.length} records
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                                    disabled={page === 1} onClick={() => setPage(1)}>«</button>
                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                                    disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                                        acc.push(p); return acc;
                                    }, [])
                                    .map((p, i) => typeof p === 'string' ? (
                                        <span key={`dot-${i}`} style={{ padding: '0.3rem 0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>…</span>
                                    ) : (
                                        <button key={p} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem',
                                            background: page === p ? 'var(--color-primary)' : undefined,
                                            color: page === p ? '#fff' : undefined }}
                                            onClick={() => setPage(p)}>{p}</button>
                                    ))}
                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                                    disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                                    disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
