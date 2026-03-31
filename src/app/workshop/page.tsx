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

    const serviceCharges = Number(formData.serviceCharges) || 0;
    const itemsTotal = billItems.reduce((s, i) => s + i.customerPrice * i.quantity, 0);
    const totalCost = billItems.reduce((s, i) => s + i.retailPrice * i.quantity, 0);
    const totalAmount = serviceCharges + itemsTotal;
    const margin = totalAmount - totalCost;

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
                setTimeout(() => { window.print(); setPrintingService(null); }, 100);
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
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Workshop Services</h1>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
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
                                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}>
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
                                        {/* Quick-add grid — all stock items visible at once */}
                                        {stockList.filter(s => s.quantity > 0).length === 0 ? (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No stock items. Add from Workshop Stock page.</div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                                {stockList.filter(s => s.quantity > 0).map(s => {
                                                    const inBill = billItems.find(i => i.stockId === s._id);
                                                    return (
                                                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', background: inBill ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '6px', border: inBill ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent' }}>
                                                            <div style={{ fontSize: '0.75rem' }}>
                                                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                                <div style={{ color: 'var(--color-success)' }}>Rs.{s.customerPrice}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                {inBill && (
                                                                    <>
                                                                        <button type="button"
                                                                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                                                                            onClick={() => {
                                                                                if (inBill.quantity <= 1) {
                                                                                    setBillItems(billItems.filter(i => i.stockId !== s._id));
                                                                                } else {
                                                                                    setBillItems(billItems.map(i => i.stockId === s._id ? { ...i, quantity: i.quantity - 1 } : i));
                                                                                }
                                                                            }}>−</button>
                                                                        <span style={{ fontSize: '0.8rem', minWidth: '16px', textAlign: 'center' }}>{inBill.quantity}</span>
                                                                    </>
                                                                )}
                                                                <button type="button"
                                                                    style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                                                                    onClick={() => {
                                                                        if (inBill) {
                                                                            if (inBill.quantity >= s.quantity) { alert(`Only ${s.quantity} in stock`); return; }
                                                                            setBillItems(billItems.map(i => i.stockId === s._id ? { ...i, quantity: i.quantity + 1 } : i));
                                                                        } else {
                                                                            setBillItems([...billItems, { stockId: s._id, name: s.name, quantity: 1, retailPrice: s.retailPrice, customerPrice: s.customerPrice }]);
                                                                        }
                                                                    }}>+</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <input className="input" style={{ flex: 2 }} placeholder="Item name (e.g. CD70 Oil)"
                                            value={manualItem.name}
                                            onChange={e => setManualItem({ ...manualItem, name: e.target.value })} />
                                        <input type="number" className="input" style={{ flex: 1 }} placeholder="Price"
                                            value={manualItem.price}
                                            onChange={e => setManualItem({ ...manualItem, price: e.target.value })} />
                                        <input type="number" className="input" style={{ width: '55px' }} placeholder="Qty"
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginBottom: '4px' }}>
                                    <span>Total Bill</span>
                                    <span>Rs. {totalAmount.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
                                    <span>Margin / Profit</span>
                                    <span>Rs. {margin.toLocaleString()}</span>
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
                        <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>Service</th>
                                        <th>Bill</th>
                                        <th>Margin</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(record => (
                                        <tr key={record._id}>
                                            <td>{new Date(record.date).toLocaleDateString()}</td>
                                            <td>
                                                <strong>{record.customerName}</strong>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{record.bikeNumber}</div>
                                            </td>
                                            <td>
                                                {record.serviceType}
                                                {record.items?.length > 0 && (
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{record.items.length} part(s)</div>
                                                )}
                                            </td>
                                            <td>Rs. {(record.totalAmount ?? record.serviceCharges ?? 0).toLocaleString()}</td>
                                            <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                                Rs. {(record.margin ?? 0).toLocaleString()}
                                            </td>
                                            <td>
                                                <button className="btn btn-secondary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => {
                                                        setPrintingService(record);
                                                        setTimeout(() => { window.print(); setPrintingService(null); }, 100);
                                                    }}>
                                                    🖨️ Re-Print
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {printingService && <ServiceReceipt service={printingService} />}
            </div>
        </DashboardLayout>
    );
}
