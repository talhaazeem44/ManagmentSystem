'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ServiceReceipt from '@/components/ServiceReceipt';

interface StockItem {
    _id: string;
    name: string;
    category: string;
    retailPrice: number;
    customerPrice: number;
    quantity: number;
}

interface BillItem {
    stockId: string;
    name: string;
    quantity: number;
    retailPrice: number;
    customerPrice: number;
}

interface ServiceRecord {
    _id?: string;
    customerName: string;
    customerMobile: string;
    bikeNumber: string;
    serviceType: string;
    description: string;
    serviceCharges: number;
    items: BillItem[];
    totalAmount: number;
    totalCost: number;
    margin: number;
    date: string;
}

export default function WorkshopPage() {
    const [history, setHistory] = useState<ServiceRecord[]>([]);
    const [stockList, setStockList] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [printingService, setPrintingService] = useState<ServiceRecord | null>(null);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [itemTab, setItemTab] = useState<'stock' | 'manual'>('stock');
    const [manualItem, setManualItem] = useState({ name: '', price: '', qty: '1' });
    const [stockSearch, setStockSearch] = useState('');
    const [formData, setFormData] = useState({
        customerName: '',
        customerMobile: '',
        bikeNumber: '',
        serviceType: 'Tuning',
        description: '',
        serviceCharges: '',
    });

    useEffect(() => {
        fetchHistory();
        fetchStock();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/workshop');
            if (res.ok) setHistory(await res.json());
        } catch { }
    };

    const fetchStock = async () => {
        try {
            const res = await fetch('/api/workshop/stock');
            if (res.ok) setStockList(await res.json());
        } catch { }
    };


    const removeItem = (idx: number) => {
        setBillItems(billItems.filter((_, i) => i !== idx));
    };

    const deleteRecord = async (id: string) => {
        if (!confirm('Delete this record?')) return;
        await fetch(`/api/workshop/${id}`, { method: 'DELETE' });
        setHistory(history.filter(r => r._id !== id));
    };

    const serviceCharges = Number(formData.serviceCharges) || 0;
    const itemsTotal = billItems.reduce((s, i) => s + i.customerPrice * i.quantity, 0);
    const totalAmount = serviceCharges + itemsTotal;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/workshop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    serviceCharges,
                    items: billItems,
                    date: new Date(),
                }),
            });

            if (res.ok) {
                const newRecord = await res.json();
                setHistory([newRecord, ...history]);
                setFormData({ customerName: '', customerMobile: '', bikeNumber: '', serviceType: 'Tuning', description: '', serviceCharges: '' });
                setBillItems([]);
                fetchStock(); // refresh stock quantities
                setPrintingService(newRecord);
            }
        } catch {
            alert('Failed to save service record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Workshop Services</h1>

                <div className="grid-2" style={{ alignItems: 'start' }}>
                    {/* New Service Form */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>New Service Bill</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Customer Name</label>
                                <input type="text" className="input" required value={formData.customerName}
                                    onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Mobile Number</label>
                                <input type="text" className="input" value={formData.customerMobile}
                                    onChange={e => setFormData({ ...formData, customerMobile: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Bike Number</label>
                                <input type="text" className="input" value={formData.bikeNumber}
                                    onChange={e => setFormData({ ...formData, bikeNumber: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Service Type</label>
                                <select className="select" value={formData.serviceType}
                                    onChange={e => {
                                        const type = e.target.value;
                                        const defaultCharges: Record<string, string> = {
                                            'Tuning': '150',
                                            'Oil Change': '200',
                                            'Repair': '',
                                            'Washing': '100',
                                            'Other': '',
                                        };
                                        setFormData({ ...formData, serviceType: type, serviceCharges: defaultCharges[type] ?? '' });
                                    }}>
                                    <option value="Tuning">Tuning</option>
                                    <option value="Oil Change">Oil Change</option>
                                    <option value="Repair">General Repair</option>
                                    <option value="Washing">Washing</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Service Charges (Rs.) — Labour</label>
                                <input type="number" className="input" min="0" value={formData.serviceCharges}
                                    onChange={e => setFormData({ ...formData, serviceCharges: e.target.value })} />
                            </div>

                            {/* Stock Items Picker */}
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <button type="button" onClick={() => setItemTab('stock')}
                                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: itemTab === 'stock' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: itemTab === 'stock' ? 700 : 400 }}>
                                        From Stock
                                    </button>
                                    <button type="button" onClick={() => setItemTab('manual')}
                                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: itemTab === 'manual' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: itemTab === 'manual' ? 700 : 400 }}>
                                        Manual Entry
                                    </button>
                                </div>

                                {itemTab === 'stock' ? (
                                    <div>
                                        {stockList.filter(s => s.quantity > 0).length === 0 ? (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No stock items. Add from Workshop Stock page.</div>
                                        ) : (
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <input
                                                    className="input"
                                                    placeholder="Search stock item..."
                                                    value={stockSearch}
                                                    onChange={e => setStockSearch(e.target.value)}
                                                    style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}
                                                />
                                                {stockSearch.trim() && (() => {
                                                    const filtered = stockList.filter(s => s.quantity > 0 && s.name.toLowerCase().includes(stockSearch.toLowerCase()));
                                                    return filtered.length === 0 ? (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>No items match "{stockSearch}"</div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                            {filtered.map(s => {
                                                                const inBill = billItems.find(i => i.stockId === s._id);
                                                                return (
                                                                    <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: inBill ? 'rgba(16,185,129,0.15)' : 'var(--color-bg)', borderRadius: '8px', border: inBill ? '2px solid rgba(16,185,129,0.5)' : '1px solid var(--color-border)' }}>
                                                                        <div>
                                                                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.name}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Rs. {s.customerPrice.toLocaleString()} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>· Stock: {s.quantity}</span></div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                            {inBill ? (
                                                                                <>
                                                                                    <button type="button"
                                                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'var(--color-text)', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                                                                                        onClick={() => {
                                                                                            if (inBill.quantity <= 1) {
                                                                                                setBillItems(billItems.filter(i => i.stockId !== s._id));
                                                                                            } else {
                                                                                                setBillItems(billItems.map(i => i.stockId === s._id ? { ...i, quantity: i.quantity - 1 } : i));
                                                                                            }
                                                                                        }}>−</button>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max={s.quantity}
                                                                                        value={inBill.quantity}
                                                                                        onChange={e => {
                                                                                            const val = Math.max(1, Math.min(s.quantity, Number(e.target.value) || 1));
                                                                                            setBillItems(billItems.map(i => i.stockId === s._id ? { ...i, quantity: val } : i));
                                                                                        }}
                                                                                        style={{ width: '44px', textAlign: 'center', padding: '2px 4px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid var(--color-border)', borderRadius: '6px', background: 'var(--color-bg)' }}
                                                                                    />
                                                                                    <button type="button"
                                                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                                                                                        onClick={() => {
                                                                                            if (inBill.quantity >= s.quantity) { alert(`Only ${s.quantity} in stock`); return; }
                                                                                            setBillItems(billItems.map(i => i.stockId === s._id ? { ...i, quantity: i.quantity + 1 } : i));
                                                                                        }}>+</button>
                                                                                    <button type="button"
                                                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                                                                                        onClick={() => setBillItems(billItems.filter(i => i.stockId !== s._id))}>✕</button>
                                                                                </>
                                                                            ) : (
                                                                                <button type="button"
                                                                                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                                                                                    onClick={() => {
                                                                                        setBillItems([...billItems, { stockId: s._id, name: s.name, quantity: 1, retailPrice: s.retailPrice, customerPrice: s.customerPrice }]);
                                                                                    }}>+</button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                        <input className="input" placeholder="Item name (e.g. CD70 Oil)"
                                            value={manualItem.name}
                                            onChange={e => setManualItem({ ...manualItem, name: e.target.value })} />
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <input type="number" className="input" placeholder="Price"
                                                value={manualItem.price}
                                                onChange={e => setManualItem({ ...manualItem, price: e.target.value })} />
                                            <input type="number" className="input" style={{ maxWidth: '70px' }} placeholder="Qty"
                                                min="1" value={manualItem.qty}
                                                onChange={e => setManualItem({ ...manualItem, qty: e.target.value })} />
                                            <button type="button" className="btn btn-secondary"
                                                onClick={() => {
                                                    if (!manualItem.name || !manualItem.price) return;
                                                    setBillItems([...billItems, { stockId: '', name: manualItem.name, quantity: Number(manualItem.qty) || 1, retailPrice: Number(manualItem.price), customerPrice: Number(manualItem.price) }]);
                                                    setManualItem({ name: '', price: '', qty: '1' });
                                                }}
                                                disabled={!manualItem.name || !manualItem.price}>Add</button>
                                        </div>
                                    </div>
                                )}

                                {/* Bill Items List */}
                                {billItems.length > 0 && (
                                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ textAlign: 'left', padding: '4px' }}>Item</th>
                                                <th style={{ textAlign: 'right', padding: '4px' }}>Qty</th>
                                                <th style={{ textAlign: 'right', padding: '4px' }}>Price</th>
                                                <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '4px' }}>{item.name}</td>
                                                    <td style={{ textAlign: 'right', padding: '4px' }}>{item.quantity}</td>
                                                    <td style={{ textAlign: 'right', padding: '4px' }}>Rs.{item.customerPrice.toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', padding: '4px' }}>Rs.{(item.customerPrice * item.quantity).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', padding: '4px' }}>
                                                        <button type="button" onClick={() => removeItem(idx)}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Bill Summary */}
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Service Charges</span>
                                    <span>Rs. {serviceCharges.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Parts Total</span>
                                    <span>Rs. {itemsTotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                                    <span>Total Bill</span>
                                    <span>Rs. {totalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="label">Additional Notes</label>
                                <textarea className="input" style={{ minHeight: '60px' }} value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Saving...' : 'Save & Print Bill'}
                            </button>
                        </form>
                    </div>

                    {/* History */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Recent Workshop History</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '700px', overflowY: 'auto' }}>
                            {history.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No records yet.</div>
                            )}
                            {history.map(record => (
                                <div key={record._id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: '1 1 180px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>{record.customerName}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{record.bikeNumber}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span>{new Date(record.date).toLocaleDateString()}</span>
                                            <span>· {record.serviceType}{record.items?.length > 0 ? ` + ${record.items.length} part(s)` : ''}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', display: 'flex', gap: '0.75rem' }}>
                                            <span style={{ fontWeight: 700 }}>Rs. {(record.totalAmount ?? record.serviceCharges ?? 0).toLocaleString()}</span>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Margin: Rs. {(record.margin ?? 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                        <button className="btn btn-secondary"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                            onClick={() => setPrintingService(record)}>🖨️</button>
                                        <button className="btn"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                            onClick={() => deleteRecord(record._id!)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {printingService && <ServiceReceipt service={printingService} onDone={() => setPrintingService(null)} />}
            </div>
        </DashboardLayout>
    );
}
