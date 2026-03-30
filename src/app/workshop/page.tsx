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
    const [selectedStockId, setSelectedStockId] = useState('');
    const [selectedQty, setSelectedQty] = useState(1);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
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

    const addItem = () => {
        const stock = stockList.find(s => s._id === selectedStockId);
        if (!stock) return;
        if (selectedQty > stock.quantity) {
            alert(`Only ${stock.quantity} units available in stock`);
            return;
        }
        const existing = billItems.findIndex(i => i.stockId === selectedStockId);
        if (existing >= 0) {
            const updated = [...billItems];
            updated[existing].quantity += selectedQty;
            setBillItems(updated);
        } else {
            setBillItems([...billItems, {
                stockId: stock._id,
                name: stock.name,
                quantity: selectedQty,
                retailPrice: stock.retailPrice,
                customerPrice: stock.customerPrice,
            }]);
        }
        setSelectedStockId('');
        setSelectedQty(1);
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
                                <label className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>Add Parts / Stock Items</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <select className="select" style={{ flex: 2 }} value={selectedStockId}
                                        onChange={e => setSelectedStockId(e.target.value)}>
                                        <option value="">Select item...</option>
                                        {stockList.filter(s => s.quantity > 0).map(s => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} (Rs.{s.customerPrice} | Qty:{s.quantity})
                                            </option>
                                        ))}
                                    </select>
                                    <input type="number" className="input" style={{ flex: 1, width: '60px' }}
                                        min="1" value={selectedQty}
                                        onChange={e => setSelectedQty(Number(e.target.value))} />
                                    <button type="button" className="btn btn-secondary" onClick={addItem}
                                        disabled={!selectedStockId}>Add</button>
                                </div>

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
