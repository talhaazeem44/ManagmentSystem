'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';
import { HONDA_BIKE_MODELS } from '@/lib/constants';

interface UsedBike {
    _id: string;
    model: string;
    color?: string;
    engineNumber?: string;
    chassisNumber?: string;
    sourceName?: string;
    sourceMobile?: string;
    purchasePrice: number;
    purchaseDate: string;
    purchaseDeductFrom: 'CASH' | 'MARGIN';
    status: 'IN_STOCK' | 'SOLD';
    soldPrice?: number;
    soldDate?: string;
    buyerName?: string;
    notes?: string;
}

const emptyForm = {
    model: '', color: '', engineNumber: '', chassisNumber: '',
    sourceName: '', sourceMobile: '',
    purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0],
    purchaseDeductFrom: 'CASH' as 'CASH' | 'MARGIN',
    notes: '',
};

const emptySellForm = { soldPrice: '', soldDate: new Date().toISOString().split('T')[0], buyerName: '' };

export default function UsedBikesPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [bikes, setBikes] = useState<UsedBike[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'IN_STOCK' | 'SOLD'>('ALL');
    const [sellingId, setSellingId] = useState<string | null>(null);
    const [sellForm, setSellForm] = useState(emptySellForm);
    const [selling, setSelling] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchBikes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/used-bikes');
            if (res.ok) setBikes(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBikes(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/used-bikes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, purchasePrice: Number(form.purchasePrice) }),
            });
            if (res.ok) {
                showToast('Used bike purchase recorded', 'success');
                setForm(emptyForm);
                setShowForm(false);
                fetchBikes();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed to save', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSell = async (id: string) => {
        setSelling(true);
        const isEdit = bikes.find(b => b._id === id)?.status === 'SOLD';
        try {
            const res = await fetch(`/api/used-bikes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sell: { soldPrice: Number(sellForm.soldPrice), soldDate: sellForm.soldDate, buyerName: sellForm.buyerName } }),
            });
            if (res.ok) {
                showToast(isEdit ? 'Sale updated' : 'Resale recorded — margin added', 'success');
                setSellingId(null);
                setSellForm(emptySellForm);
                fetchBikes();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed to record sale', 'error');
            }
        } finally {
            setSelling(false);
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/used-bikes/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Deleted', 'success');
            setConfirmDeleteId(null);
            fetchBikes();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.message || 'Delete failed', 'error');
            setConfirmDeleteId(null);
        }
    };

    const filtered = bikes.filter(b => filter === 'ALL' || b.status === filter);
    const inStock = bikes.filter(b => b.status === 'IN_STOCK');
    const sold = bikes.filter(b => b.status === 'SOLD');
    const inStockValue = inStock.reduce((s, b) => s + b.purchasePrice, 0);
    const totalResaleProfit = sold.reduce((s, b) => s + ((b.soldPrice || 0) - b.purchasePrice), 0);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Used Bikes</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Buy back bikes from customers and resell them</p>
                    </div>
                    <button className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setShowForm(s => !s)}>
                        {showForm ? 'Cancel' : '➕ Record Buyback'}
                    </button>
                </div>

                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>In Stock</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{inStock.length}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Rs. {inStockValue.toLocaleString()} tied up</div>
                    </div>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>Resold</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{sold.length}</div>
                    </div>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: `4px solid ${totalResaleProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>Total Resale Margin</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalResaleProfit >= 0 ? '#10b981' : '#ef4444' }}>Rs. {totalResaleProfit.toLocaleString()}</div>
                    </div>
                </div>

                {/* Buyback form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>🔁 Record a Buyback Purchase</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Model *</label>
                                <select className="select" required value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}>
                                    <option value="">Select model</option>
                                    {HONDA_BIKE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Color</label>
                                <input className="input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g. Black" />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Engine #</label>
                                <input className="input" value={form.engineNumber} onChange={e => setForm({ ...form, engineNumber: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Chassis #</label>
                                <input className="input" value={form.chassisNumber} onChange={e => setForm({ ...form, chassisNumber: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Bought From (name)</label>
                                <input className="input" value={form.sourceName} onChange={e => setForm({ ...form, sourceName: e.target.value })} placeholder="Customer name" />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Their Mobile</label>
                                <input className="input" value={form.sourceMobile} onChange={e => setForm({ ...form, sourceMobile: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Purchase Price (Rs.) *</label>
                                <input type="number" min="1" className="input" required value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Purchase Date</label>
                                <input type="date" className="input" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Deduct From *</label>
                                <select className="select" value={form.purchaseDeductFrom} onChange={e => setForm({ ...form, purchaseDeductFrom: e.target.value as 'CASH' | 'MARGIN' })}>
                                    <option value="CASH">Cash</option>
                                    <option value="MARGIN">Margin</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="label">Notes</label>
                            <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional note..." />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : '✅ Save Purchase'}
                        </button>
                    </form>
                )}

                {/* Filter */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {(['ALL', 'IN_STOCK', 'SOLD'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                            {f === 'ALL' ? 'All' : f === 'IN_STOCK' ? 'In Stock' : 'Resold'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <Loader size={140} text="Loading..." fullPage />
                ) : filtered.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No records yet</div>
                ) : (
                    <div className="card" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    {['Model', 'Bought From', 'Purchase', 'Sold', 'Margin', 'Status', ''].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Model' || h === 'Bought From' || h === '' ? 'left' : 'right', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(b => {
                                    const margin = b.status === 'SOLD' ? (b.soldPrice || 0) - b.purchasePrice : null;
                                    return (
                                        <tr key={b._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '8px 10px' }}>
                                                <div style={{ fontWeight: 600 }}>{b.model} {b.color ? `· ${b.color}` : ''}</div>
                                                {b.engineNumber && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{b.engineNumber} / {b.chassisNumber}</div>}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <div>{b.sourceName || '—'}</div>
                                                {b.sourceMobile && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{b.sourceMobile}</div>}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: '#ef4444' }}>Rs. {b.purchasePrice.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                                    {new Date(b.purchaseDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · {b.purchaseDeductFrom}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                {b.status === 'SOLD' ? (
                                                    <>
                                                        <div style={{ fontWeight: 700, color: '#10b981' }}>Rs. {(b.soldPrice || 0).toLocaleString()}</div>
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                                            {b.soldDate && new Date(b.soldDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} {b.buyerName ? `· ${b.buyerName}` : ''}
                                                        </div>
                                                    </>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: margin === null ? 'var(--color-text-muted)' : margin >= 0 ? '#10b981' : '#ef4444' }}>
                                                {margin === null ? '—' : `Rs. ${margin.toLocaleString()}`}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, background: b.status === 'IN_STOCK' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: b.status === 'IN_STOCK' ? '#f59e0b' : '#10b981' }}>
                                                    {b.status === 'IN_STOCK' ? 'IN STOCK' : 'SOLD'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                {confirmDeleteId === b._id ? (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleDelete(b._id)}>Yes</button>
                                                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => setConfirmDeleteId(null)}>No</button>
                                                    </div>
                                                ) : sellingId === b._id ? null : b.status === 'IN_STOCK' ? (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                            onClick={() => { setSellingId(b._id); setSellForm(emptySellForm); }}>💰 Sell</button>
                                                        <button className="btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                                                            onClick={() => setConfirmDeleteId(b._id)}>🗑️</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                                                            onClick={() => { setSellingId(b._id); setSellForm({ soldPrice: String(b.soldPrice ?? ''), soldDate: b.soldDate ? b.soldDate.split('T')[0] : new Date().toISOString().split('T')[0], buyerName: b.buyerName ?? '' }); }}>✏️ Edit</button>
                                                        <button className="btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                                                            onClick={() => setConfirmDeleteId(b._id)}>🗑️</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {sellingId && (
                            <div style={{ padding: '1rem 1.25rem', borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                    {bikes.find(b => b._id === sellingId)?.status === 'SOLD' ? 'Edit sale' : 'Record resale'} — {bikes.find(b => b._id === sellingId)?.model}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Sold Price (Rs.) *</label>
                                        <input type="number" min="1" className="input" value={sellForm.soldPrice} onChange={e => setSellForm({ ...sellForm, soldPrice: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Sale Date</label>
                                        <input type="date" className="input" value={sellForm.soldDate} onChange={e => setSellForm({ ...sellForm, soldDate: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Buyer Name</label>
                                        <input className="input" value={sellForm.buyerName} onChange={e => setSellForm({ ...sellForm, buyerName: e.target.value })} />
                                    </div>
                                    <button className="btn btn-primary" disabled={selling || !sellForm.soldPrice} onClick={() => handleSell(sellingId)}>
                                        {selling ? 'Saving...' : bikes.find(b => b._id === sellingId)?.status === 'SOLD' ? '✅ Save Changes' : '✅ Confirm Sale'}
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setSellingId(null)}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
