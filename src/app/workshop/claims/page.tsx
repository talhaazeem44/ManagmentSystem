'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { todayDateInputValue } from '@/lib/dates';

interface StockItem {
    _id: string;
    name: string;
    productCode?: string;
    quantity: number;
}

interface Claim {
    _id: string;
    stockId?: string;
    itemName: string;
    productCode?: string;
    quantity: number;
    reason?: string;
    customerName?: string;
    bikeNumber?: string;
    status: 'PENDING' | 'RESOLVED';
    claimDate: string;
    resolvedDate?: string;
    replacementReceived?: boolean;
    notes?: string;
}

const emptyForm = {
    stockId: '', itemName: '', productCode: '', quantity: '1',
    reason: '', customerName: '', bikeNumber: '', claimDate: todayDateInputValue(), notes: '',
};

export default function WarrantyClaimsPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [replacementReceived, setReplacementReceived] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [stockRes, claimsRes] = await Promise.all([
                fetch('/api/workshop/stock'),
                fetch('/api/workshop/claims'),
            ]);
            if (stockRes.ok) setStock(await stockRes.json());
            if (claimsRes.ok) setClaims(await claimsRes.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const suggestions = form.itemName.trim().length >= 1 && !form.stockId
        ? stock.filter(s =>
            s.name.toLowerCase().includes(form.itemName.toLowerCase()) ||
            (s.productCode && s.productCode.toLowerCase().includes(form.itemName.toLowerCase()))
        ).slice(0, 8)
        : [];

    const selectStockItem = (item: StockItem) => {
        setForm({ ...form, stockId: item._id, itemName: item.name, productCode: item.productCode || '' });
        setShowSuggestions(false);
    };

    const selectedStock = stock.find(s => s._id === form.stockId);
    const qtyExceedsStock = !!selectedStock && Number(form.quantity) > selectedStock.quantity;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.itemName || !form.quantity || Number(form.quantity) <= 0) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/workshop/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
            });
            if (res.ok) {
                showToast('Sent for warranty claim', 'success');
                setForm(emptyForm);
                fetchAll();
            } else {
                const err = await res.json().catch(() => ({ message: 'Failed to save' }));
                showToast(err.message, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const openResolve = (id: string) => {
        setResolvingId(id);
        setReplacementReceived(false);
    };

    const confirmResolve = async (id: string) => {
        const res = await fetch(`/api/workshop/claims/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'RESOLVED', replacementReceived }),
        });
        if (res.ok) {
            showToast('Claim marked resolved', 'success');
            setResolvingId(null);
            fetchAll();
        } else {
            showToast('Failed to update claim', 'error');
        }
    };

    const reopenClaim = async (id: string) => {
        const res = await fetch(`/api/workshop/claims/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PENDING' }),
        });
        if (res.ok) { showToast('Claim reopened', 'success'); fetchAll(); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this claim record?')) return;
        const res = await fetch(`/api/workshop/claims/${id}`, { method: 'DELETE' });
        if (res.ok) { showToast('Claim deleted', 'success'); fetchAll(); }
        else showToast('Failed to delete', 'error');
    };

    const filtered = claims.filter(c => filter === 'ALL' || c.status === filter);
    const pendingCount = claims.filter(c => c.status === 'PENDING').length;

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>🛡️ Warranty Claims</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Track parts sent back to the supplier for a warranty claim — they&apos;re removed from sellable stock until resolved.
                </p>

                <div className="grid-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
                    {/* ── New Claim ── */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>+ Send Item for Claim</div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ position: 'relative' }}>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Item</label>
                                <input className="input" placeholder="Search by name or product code…" autoComplete="off"
                                    value={form.itemName}
                                    onChange={e => { setForm({ ...form, itemName: e.target.value, stockId: '', productCode: '' }); setShowSuggestions(true); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '220px', overflowY: 'auto' }}>
                                        {suggestions.map(s => (
                                            <div key={s._id} onMouseDown={() => selectStockItem(s)}
                                                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{s.name}{s.productCode && <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px', fontSize: '0.75rem' }}>{s.productCode}</span>}</span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{s.quantity} in stock</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!form.stockId && form.itemName && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                        Not in your stock list? That&apos;s fine — it&apos;ll still be recorded, just without a stock-quantity link.
                                    </div>
                                )}
                                {selectedStock && (
                                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                        {selectedStock.quantity} currently in stock
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="label" style={{ fontSize: '0.75rem' }}>Quantity</label>
                                    <input type="number" min="1" className="input" value={form.quantity}
                                        onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="label" style={{ fontSize: '0.75rem' }}>Date</label>
                                    <input type="date" className="input" value={form.claimDate}
                                        onChange={e => setForm({ ...form, claimDate: e.target.value })} />
                                </div>
                            </div>
                            {qtyExceedsStock && (
                                <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                    Only {selectedStock!.quantity} in stock — double check the quantity.
                                </div>
                            )}

                            <input className="input" placeholder="Reason (e.g. defective, not working)"
                                value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />

                            <div className="form-row">
                                <input className="input" placeholder="Customer name (optional)"
                                    value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
                                <input className="input" placeholder="Bike number (optional)"
                                    value={form.bikeNumber} onChange={e => setForm({ ...form, bikeNumber: e.target.value })} />
                            </div>

                            <textarea className="input" placeholder="Notes (optional)" style={{ minHeight: '48px' }}
                                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

                            <button type="submit" className="btn btn-primary" disabled={submitting || !form.itemName || !form.quantity}>
                                {submitting ? 'Saving...' : '🛡️ Send for Claim'}
                            </button>
                        </form>
                    </div>

                    {/* ── Claims List ── */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Claims {pendingCount > 0 && <span style={{ color: '#f59e0b' }}>({pendingCount} pending)</span>}</div>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                {(['PENDING', 'RESOLVED', 'ALL'] as const).map(f => (
                                    <button key={f} onClick={() => setFilter(f)}
                                        className={f === filter ? 'btn btn-primary' : 'btn btn-secondary'}
                                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}>
                                        {f === 'PENDING' ? 'Pending' : f === 'RESOLVED' ? 'Resolved' : 'All'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading...</div>
                        ) : filtered.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No claims here.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '620px', overflowY: 'auto' }}>
                                {filtered.map(c => (
                                    <div key={c._id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px', background: c.status === 'PENDING' ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                                    {c.itemName} {c.productCode && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{c.productCode}</span>}
                                                    <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>× {c.quantity}</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                                    {new Date(c.claimDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {c.reason && ` · ${c.reason}`}
                                                    {c.customerName && ` · ${c.customerName}`}
                                                    {c.bikeNumber && ` · ${c.bikeNumber}`}
                                                </div>
                                                {c.notes && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>{c.notes}</div>}
                                            </div>
                                            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap', background: c.status === 'PENDING' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: c.status === 'PENDING' ? '#f59e0b' : '#10b981' }}>
                                                {c.status === 'PENDING' ? 'PENDING' : 'RESOLVED'}
                                            </span>
                                        </div>

                                        {c.status === 'RESOLVED' && (
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                                                Resolved {c.resolvedDate && new Date(c.resolvedDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                                {c.replacementReceived ? ' · ✅ Replacement added back to stock' : ' · No replacement received'}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                                            {c.status === 'PENDING' && resolvingId !== c._id && (
                                                <button className="btn btn-success" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                                    onClick={() => openResolve(c._id)}>✅ Mark Resolved</button>
                                            )}
                                            {c.status === 'RESOLVED' && (
                                                <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                                    onClick={() => reopenClaim(c._id)}>↩️ Reopen</button>
                                            )}
                                            <button className="btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                                onClick={() => handleDelete(c._id)}>🗑️</button>
                                        </div>

                                        {resolvingId === c._id && (
                                            <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--color-border)' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                                    <input type="checkbox" checked={replacementReceived} onChange={e => setReplacementReceived(e.target.checked)} />
                                                    Supplier sent a working replacement {c.stockId ? `(adds ${c.quantity} back to stock)` : ''}
                                                </label>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                                                        onClick={() => confirmResolve(c._id)}>Confirm</button>
                                                    <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                                                        onClick={() => setResolvingId(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
