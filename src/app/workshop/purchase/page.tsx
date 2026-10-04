'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { todayDateInputValue } from '@/lib/dates';

type PaymentMode = 'CASH' | 'BANK_TRANSFER';

interface StockItem {
    _id: string;
    name: string;
    category: string;
    retailPrice: number;
    customerPrice: number;
    quantity: number;
}

interface PurchaseRecord {
    _id: string;
    amount: number;
    description: string;
    paymentMode?: PaymentMode;
    date: string;
}

const CATEGORIES = ['Oil', 'Filter', 'Parts', 'Accessories', 'Consumable', 'Other'];

const emptyForm = {
    name: '', category: 'Other', quantity: '', costPrice: '', sellingPrice: '',
    paymentMode: 'CASH' as PaymentMode, supplier: '', date: todayDateInputValue(),
};

export default function WorkshopPurchasePage() {
    const { toasts, showToast, removeToast } = useToast();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const [stockRes, purchaseRes] = await Promise.all([
            fetch('/api/workshop/stock'),
            fetch('/api/workshop/purchase'),
        ]);
        if (stockRes.ok) setStock(await stockRes.json());
        if (purchaseRes.ok) setPurchases(await purchaseRes.json());
    };

    // Typed name matching an item already in stock (case-insensitive) — this purchase will
    // restock it rather than create a duplicate, so show what's already on record for it.
    const matchedItem = stock.find(s => s.name.toLowerCase() === form.name.trim().toLowerCase());

    const handleNameChange = (name: string) => {
        const match = stock.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
        setForm(prev => ({
            ...prev,
            name,
            ...(match ? { category: match.category, costPrice: String(match.retailPrice), sellingPrice: String(match.customerPrice) } : {}),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/workshop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    category: form.category,
                    quantity: Number(form.quantity),
                    costPrice: Number(form.costPrice),
                    sellingPrice: Number(form.sellingPrice),
                    paymentMode: form.paymentMode,
                    supplier: form.supplier,
                    date: form.date,
                }),
            });
            if (res.ok) {
                showToast('Purchase saved — added to stock', 'success');
                setForm({ ...emptyForm, date: todayDateInputValue() });
                await fetchData();
            } else {
                const err = await res.json().catch(() => ({ message: `Failed to save purchase (HTTP ${res.status})` }));
                showToast(err.message || 'Failed to save purchase', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Error saving purchase — check your connection', 'error');
        } finally {
            setSaving(false);
        }
    };

    const totalCost = Number(form.costPrice || 0) * Number(form.quantity || 0);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>Workshop Purchase</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Buy oil or parts from a supplier — it adds straight into Stock, and the cost is logged
                    as a Workshop expense (cash or bank) automatically.
                </p>

                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>➕ Record a Purchase</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                                <label className="label">Item Name</label>
                                <input className="input" required list="stock-names" value={form.name}
                                    onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Castrol 4T Oil" />
                                <datalist id="stock-names">
                                    {stock.map(s => <option key={s._id} value={s.name} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="label">Category</label>
                                <select className="select" value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Quantity Purchased</label>
                                <input className="input" type="text" inputMode="decimal" required value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Cost Price (per unit, Rs.)</label>
                                <input className="input" type="text" inputMode="decimal" required value={form.costPrice}
                                    onChange={e => setForm({ ...form, costPrice: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Selling Price (per unit, Rs.)</label>
                                <input className="input" type="text" inputMode="decimal" required value={form.sellingPrice}
                                    onChange={e => setForm({ ...form, sellingPrice: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Paid As</label>
                                <select className="select" value={form.paymentMode}
                                    onChange={e => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}>
                                    <option value="CASH">Cash</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Supplier / Buyer (optional)</label>
                                <input className="input" value={form.supplier}
                                    onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Al-Madina Traders" />
                            </div>
                            <div>
                                <label className="label">Date</label>
                                <input type="date" className="input" value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                        </div>

                        {matchedItem && (
                            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '0.8rem' }}>
                                Already in stock: <strong>{matchedItem.quantity}</strong> units on hand — this purchase will add to that, not create a new item.
                            </div>
                        )}
                        {totalCost > 0 && (
                            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                Total cost: <strong style={{ color: '#ef4444' }}>Rs. {totalCost.toLocaleString()}</strong> — will be deducted from Workshop {form.paymentMode === 'BANK_TRANSFER' ? 'Bank' : 'Cash'} automatically.
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Purchase'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Purchases</h2>
                    {purchases.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No purchases logged yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {purchases.map(p => (
                                <div key={p._id} style={{ padding: '0.6rem 0.9rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        <span style={{ marginRight: '0.4rem' }}>{p.paymentMode === 'BANK_TRANSFER' ? '🏦' : '💵'}</span>
                                        {p.description}
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                            {new Date(p.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <strong style={{ color: '#ef4444' }}>− Rs. {p.amount.toLocaleString()}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
