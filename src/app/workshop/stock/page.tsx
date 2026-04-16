'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface StockItem {
    _id?: string;
    name: string;
    category: string;
    retailPrice: number;
    customerPrice: number;
    quantity: number;
}

const CATEGORIES = ['Oil', 'Filter', 'Parts', 'Accessories', 'Consumable', 'Other'];

const emptyForm = { name: '', category: 'Other', retailPrice: '', customerPrice: '', quantity: '' };

const PAGE_SIZE = 12;

export default function WorkshopStockPage() {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [formData, setFormData] = useState<any>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => { fetchStock(); }, []);

    const fetchStock = async () => {
        const res = await fetch('/api/workshop/stock');
        if (res.ok) setStock(await res.json());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            ...formData,
            retailPrice: Number(formData.retailPrice),
            customerPrice: Number(formData.customerPrice),
            quantity: Number(formData.quantity),
        };
        try {
            if (editingId) {
                const res = await fetch(`/api/workshop/stock/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    const updated = await res.json();
                    setStock(stock.map(s => s._id === editingId ? updated : s));
                    setEditingId(null);
                }
            } else {
                const res = await fetch('/api/workshop/stock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    const created = await res.json();
                    setStock([created, ...stock]);
                    setPage(1);
                }
            }
            setFormData(emptyForm);
        } catch {
            alert('Failed to save stock item');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: StockItem) => {
        setEditingId(item._id!);
        setFormData({
            name: item.name,
            category: item.category,
            retailPrice: String(item.retailPrice),
            customerPrice: String(item.customerPrice),
            quantity: String(item.quantity),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this stock item?')) return;
        await fetch(`/api/workshop/stock/${id}`, { method: 'DELETE' });
        setStock(stock.filter(s => s._id !== id));
    };

    const totalValue = stock.reduce((sum, s) => sum + s.retailPrice * s.quantity, 0);
    const totalSellingValue = stock.reduce((sum, s) => sum + s.customerPrice * s.quantity, 0);
    const paged = stock.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.ceil(stock.length / PAGE_SIZE);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.25rem' }}>Workshop Stock</h1>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '0.875rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Total Items</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stock.length}</div>
                    </div>
                    <div className="card" style={{ padding: '0.875rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Cost Value</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>Rs. {totalValue.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '0.875rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Selling Value</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>Rs. {totalSellingValue.toLocaleString()}</div>
                    </div>
                </div>

                {/* Add / Edit Form */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                        {editingId ? '✏️ Edit Item' : '➕ Add Stock Item'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                                <label className="label">Item Name</label>
                                <input className="input" required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Category</label>
                                <select className="select" value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Cost Price (Rs.)</label>
                                <input className="input" type="number" required min="0" value={formData.retailPrice}
                                    onChange={e => setFormData({ ...formData, retailPrice: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Selling Price (Rs.)</label>
                                <input className="input" type="number" required min="0" value={formData.customerPrice}
                                    onChange={e => setFormData({ ...formData, customerPrice: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Quantity</label>
                                <input className="input" type="number" required min="0" value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>
                        </div>

                        {formData.retailPrice && formData.customerPrice && (
                            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                Margin per unit: <strong style={{ color: 'var(--color-success)' }}>
                                    Rs. {(Number(formData.customerPrice) - Number(formData.retailPrice)).toLocaleString()}
                                </strong>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : editingId ? 'Update Item' : 'Add Item'}
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-secondary"
                                    onClick={() => { setEditingId(null); setFormData(emptyForm); }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Stock Inventory List */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Stock Inventory</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{stock.length} items</span>
                    </div>

                    {stock.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No stock items yet. Add one above.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {paged.map(item => (
                                <div key={item._id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: '1 1 160px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                                            <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'var(--color-border)', borderRadius: '4px', color: 'var(--color-text-muted)' }}>{item.category}</span>
                                            <span style={{
                                                fontSize: '0.8rem', fontWeight: 700,
                                                color: item.quantity <= 2 ? '#ef4444' : item.quantity <= 5 ? 'var(--color-warning)' : 'var(--color-success)'
                                            }}>Qty: {item.quantity}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <span>Cost: Rs. {item.retailPrice.toLocaleString()}</span>
                                            <span>Sell: Rs. {item.customerPrice.toLocaleString()}</span>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                                Margin: Rs. {(item.customerPrice - item.retailPrice).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                        <button className="btn btn-secondary"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                            onClick={() => handleEdit(item)}>✏️ Edit</button>
                                        <button className="btn"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                            onClick={() => handleDelete(item._id!)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                                disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                {page} / {totalPages}
                            </span>
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                                disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
