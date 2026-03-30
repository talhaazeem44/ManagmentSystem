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

export default function WorkshopStockPage() {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [formData, setFormData] = useState<any>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this stock item?')) return;
        await fetch(`/api/workshop/stock/${id}`, { method: 'DELETE' });
        setStock(stock.filter(s => s._id !== id));
    };

    const totalValue = stock.reduce((sum, s) => sum + s.retailPrice * s.quantity, 0);
    const totalSellingValue = stock.reduce((sum, s) => sum + s.customerPrice * s.quantity, 0);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Workshop Stock</h1>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total Items</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stock.length}</div>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Stock Cost Value</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warning)' }}>Rs. {totalValue.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Stock Selling Value</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>Rs. {totalSellingValue.toLocaleString()}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    {/* Form */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                            {editingId ? 'Edit Item' : 'Add Stock Item'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Item Name</label>
                                <input className="input" required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Category</label>
                                <select className="select" value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Retail Price (Rs.) — Your Cost</label>
                                <input className="input" type="number" required min="0" value={formData.retailPrice}
                                    onChange={e => setFormData({ ...formData, retailPrice: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Customer Price (Rs.) — Selling Price</label>
                                <input className="input" type="number" required min="0" value={formData.customerPrice}
                                    onChange={e => setFormData({ ...formData, customerPrice: e.target.value })} />
                            </div>
                            {formData.retailPrice && formData.customerPrice && (
                                <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                    Margin per unit: <strong style={{ color: 'var(--color-success)' }}>
                                        Rs. {(Number(formData.customerPrice) - Number(formData.retailPrice)).toLocaleString()}
                                    </strong>
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="label">Quantity in Stock</label>
                                <input className="input" type="number" required min="0" value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
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

                    {/* Stock Table */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Stock Inventory</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Category</th>
                                        <th>Retail</th>
                                        <th>Customer</th>
                                        <th>Margin</th>
                                        <th>Qty</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stock.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No stock items yet</td></tr>
                                    )}
                                    {stock.map(item => (
                                        <tr key={item._id}>
                                            <td><strong>{item.name}</strong></td>
                                            <td><span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{item.category}</span></td>
                                            <td>Rs. {item.retailPrice.toLocaleString()}</td>
                                            <td>Rs. {item.customerPrice.toLocaleString()}</td>
                                            <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                                Rs. {(item.customerPrice - item.retailPrice).toLocaleString()}
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: item.quantity <= 2 ? 'var(--color-danger)' : item.quantity <= 5 ? 'var(--color-warning)' : 'inherit'
                                                }}>
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button className="btn btn-secondary"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => handleEdit(item)}>✏️ Edit</button>
                                                    <button className="btn"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                                                        onClick={() => handleDelete(item._id!)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
