'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ServiceReceipt from '@/components/ServiceReceipt';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface StockItem {
    _id: string;
    name: string;
    productCode?: string;
    retailPrice: number;
    customerPrice: number;
    quantity: number;
}

interface BillItem {
    stockId: string;
    name: string;
    productCode?: string;
    quantity: number;
    retailPrice: number;
    customerPrice: number;
}

interface ServiceRecord {
    _id?: string;
    customerName: string;
    customerMobile: string;
    bikeNumber: string;
    mechanicName?: string;
    serviceType: string;
    description: string;
    serviceCharges: number;
    paymentMode?: string;
    balance?: number;
    items: BillItem[];
    totalAmount: number;
    totalCost: number;
    margin: number;
    date: string;
}

export default function WorkshopPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [history, setHistory] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [printingService, setPrintingService] = useState<ServiceRecord | null>(null);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [manualItem, setManualItem] = useState({ stockId: '', name: '', productCode: '', price: '', retailPrice: '', qty: '1', noCost: false });
    const [stockList, setStockList] = useState<StockItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        customerMobile: '',
        bikeNumber: '',
        mechanicName: '',
        serviceType: 'Tuning',
        description: '',
        serviceCharges: '',
        paymentMode: 'CASH',
        receivedNow: '',
        receivedNowMode: 'CASH',
    });

    const [mechanics, setMechanics] = useState<{ _id: string; name: string }[]>([]);
    const [showMechanicMgr, setShowMechanicMgr] = useState(false);
    const [newMechanicName, setNewMechanicName] = useState('');
    const [addingMechanic, setAddingMechanic] = useState(false);
    const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
    const [editBillItems, setEditBillItems] = useState<BillItem[]>([]);
    const [editFields, setEditFields] = useState({ customerName: '', customerMobile: '', bikeNumber: '', mechanicName: '', serviceType: '', serviceCharges: '', description: '' });
    const [editManualItem, setEditManualItem] = useState({ stockId: '', name: '', productCode: '', price: '', retailPrice: '', qty: '1', noCost: false });
    const [editSuggestions, setEditSuggestions] = useState<StockItem[]>([]);
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        fetchHistory();
        fetchStock();
        fetchMechanics();
    }, []);

    const fetchMechanics = async () => {
        try {
            const res = await fetch('/api/mechanics');
            if (res.ok) setMechanics(await res.json());
        } catch { }
    };

    const handleAddMechanic = async () => {
        if (!newMechanicName.trim()) return;
        setAddingMechanic(true);
        try {
            const res = await fetch('/api/mechanics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newMechanicName.trim() }),
            });
            if (res.ok) {
                setNewMechanicName('');
                fetchMechanics();
                showToast('Mechanic added', 'success');
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed', 'error');
            }
        } finally {
            setAddingMechanic(false);
        }
    };

    const handleDeleteMechanic = async (id: string, name: string) => {
        const res = await fetch('/api/mechanics', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) {
            fetchMechanics();
            showToast(`${name} removed`, 'success');
        }
    };

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

    const suggestions = manualItem.name.trim().length >= 1
        ? stockList.filter(s =>
            s.name.toLowerCase().includes(manualItem.name.toLowerCase()) ||
            (s.productCode && s.productCode.toLowerCase().includes(manualItem.name.toLowerCase()))
        ).slice(0, 8)
        : [];

    const selectSuggestion = (item: StockItem) => {
        setManualItem({
            stockId: item._id,
            name: item.name,
            productCode: item.productCode ?? '',
            price: String(item.customerPrice),
            retailPrice: String(item.retailPrice),
            qty: '1',
            noCost: false,
        });
        setShowSuggestions(false);
    };

    const removeItem = (idx: number) => {
        setBillItems(billItems.filter((_, i) => i !== idx));
    };

    const deleteRecord = async (id: string) => {
        if (!confirm('Delete this record?')) return;
        await fetch(`/api/workshop/${id}`, { method: 'DELETE' });
        setHistory(history.filter(r => r._id !== id));
    };

    const startEdit = (record: ServiceRecord) => {
        setEditingRecord(record);
        setEditBillItems(record.items ? [...record.items] : []);
        setEditFields({
            customerName:   record.customerName || '',
            customerMobile: record.customerMobile || '',
            bikeNumber:     record.bikeNumber || '',
            mechanicName:   record.mechanicName || '',
            serviceType:    record.serviceType || '',
            serviceCharges: String(record.serviceCharges || ''),
            description:    record.description || '',
        });
        setEditManualItem({ stockId: '', name: '', productCode: '', price: '', retailPrice: '', qty: '1', noCost: false });
    };

    const addEditItem = () => {
        if (!editManualItem.name || !editManualItem.price) return;
        setEditBillItems(prev => [...prev, {
            stockId:       editManualItem.stockId,
            name:          editManualItem.name,
            productCode:   editManualItem.productCode,
            quantity:      Number(editManualItem.qty) || 1,
            retailPrice:   editManualItem.stockId ? (Number(editManualItem.retailPrice) || 0) : (editManualItem.noCost ? 0 : Number(editManualItem.price)),
            customerPrice: Number(editManualItem.price),
        }]);
        setEditManualItem({ stockId: '', name: '', productCode: '', price: '', retailPrice: '', qty: '1', noCost: false });
        setEditSuggestions([]);
    };

    const handleSaveEdit = async () => {
        if (!editingRecord?._id) return;
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/workshop/${editingRecord._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    editBill: { ...editFields, serviceCharges: Number(editFields.serviceCharges) || 0, items: editBillItems },
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setHistory(prev => prev.map(r => r._id === updated._id ? updated : r));
                setEditingRecord(null);
                showToast('Bill updated successfully', 'success');
            } else {
                const err = await res.json().catch(() => ({ message: 'Failed' }));
                showToast(err.message || 'Failed to update', 'error');
            }
        } finally {
            setSavingEdit(false);
        }
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
                body: JSON.stringify({ ...formData, serviceCharges, items: billItems, date: new Date() }),
            });
            if (res.ok) {
                const newRecord = await res.json();
                setHistory([newRecord, ...history]);
                setFormData({ customerName: '', customerMobile: '', bikeNumber: '', mechanicName: '', serviceType: 'Tuning', description: '', serviceCharges: '', paymentMode: 'CASH', receivedNow: '', receivedNowMode: 'CASH' });
                setBillItems([]);
                setPrintingService(newRecord);
            } else {
                const err = await res.json().catch(() => ({ message: 'Failed to save service record' }));
                showToast(err.message || 'Failed to save service record', 'error');
            }
        } catch {
            showToast('Failed to save service record', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Workshop Services</h1>
                    <button
                        className={`btn ${showMechanicMgr ? 'btn-secondary' : ''}`}
                        style={!showMechanicMgr ? { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' } : {}}
                        onClick={() => setShowMechanicMgr(!showMechanicMgr)}>
                        ⚙️ {showMechanicMgr ? 'Close Mechanics' : 'Manage Mechanics'}
                    </button>
                </div>

                {/* ── Manage Mechanics Panel ── */}
                {showMechanicMgr && (
                    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>⚙️ Mechanic List</div>

                        {/* Add new */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <input
                                className="input"
                                style={{ flex: 1, minWidth: '180px', maxWidth: '280px' }}
                                placeholder="New mechanic name..."
                                value={newMechanicName}
                                onChange={e => setNewMechanicName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddMechanic()}
                            />
                            <button className="btn" style={{ background: '#8b5cf6', color: '#fff' }}
                                disabled={addingMechanic || !newMechanicName.trim()}
                                onClick={handleAddMechanic}>
                                {addingMechanic ? 'Adding...' : '➕ Add'}
                            </button>
                        </div>

                        {/* List */}
                        {mechanics.length === 0 ? (
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No mechanics added yet. Add one above.</div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {mechanics.map(m => (
                                    <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '8px', padding: '0.3rem 0.6rem 0.3rem 0.8rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</span>
                                        <button onClick={() => handleDeleteMechanic(m._id, m.name)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', padding: '0 2px', lineHeight: 1 }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

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
                                <label className="label">Mechanic Name</label>
                                <select className="select" value={formData.mechanicName}
                                    onChange={e => setFormData({ ...formData, mechanicName: e.target.value })}>
                                    <option value="">— Select Mechanic —</option>
                                    {mechanics.map(m => (
                                        <option key={m._id} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Service Type</label>
                                <select className="select" value={formData.serviceType}
                                    onChange={e => {
                                        const type = e.target.value;
                                        const defaultCharges: Record<string, string> = {
                                            'First Service': '0', 'Second Service': '0', 'Third Service': '0',
                                            'Tuning': '400', 'Oil': '0', 'Repair': '', 'Washing': '100', 'Other': '',
                                        };
                                        setFormData({ ...formData, serviceType: type, serviceCharges: defaultCharges[type] ?? '' });
                                    }}>
                                    <option value="First Service">First Service (Free)</option>
                                    <option value="Second Service">Second Service (Free)</option>
                                    <option value="Third Service">Third Service (Free)</option>
                                    <option value="Tuning">Tuning</option>
                                    <option value="Oil Change">Oil Change</option>
                                    <option value="Repair">General Repair</option>
                                    <option value="Washing">Washing</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Service Charges (Rs.) — Labour</label>
                                <input type="text" inputMode="decimal" className="input" value={formData.serviceCharges}
                                    onChange={e => setFormData({ ...formData, serviceCharges: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Payment Method</label>
                                <select className="select" value={formData.paymentMode}
                                    onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}>
                                    <option value="CASH">Cash</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CREDIT">Credit</option>
                                </select>
                            </div>
                            {formData.paymentMode === 'CREDIT' && (
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="label">Amount Received Now (Rs.) — optional</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" inputMode="decimal" className="input" placeholder="0"
                                            value={formData.receivedNow}
                                            onChange={e => setFormData({ ...formData, receivedNow: e.target.value })} />
                                        <select className="select" style={{ maxWidth: '150px' }} value={formData.receivedNowMode}
                                            onChange={e => setFormData({ ...formData, receivedNowMode: e.target.value })}>
                                            <option value="CASH">Cash</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                        </select>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                                        Counted in Cash/Bank Received on the dashboard. Whatever's left of the total goes on Workshop Credit as pending.
                                    </div>
                                </div>
                            )}

                            {/* Parts / Items with autocomplete */}
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                                    Parts / Items
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                    {/* Name with autocomplete */}
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="input"
                                            placeholder="Search by name or product code…"
                                            value={manualItem.name}
                                            autoComplete="off"
                                            onChange={e => {
                                                setManualItem({ ...manualItem, name: e.target.value, stockId: '', productCode: '', price: '', retailPrice: '', noCost: false });
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                        />
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                                borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                maxHeight: '220px', overflowY: 'auto',
                                            }}>
                                                {suggestions.map(s => (
                                                    <div
                                                        key={s._id}
                                                        onMouseDown={() => selectSuggestion(s)}
                                                        style={{
                                                            padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</div>
                                                            {s.productCode && (
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{s.productCode}</div>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                            Rs.{s.customerPrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Product code (read-only if from stock, editable if manual) */}
                                    <input
                                        className="input"
                                        placeholder="Product code (optional)"
                                        value={manualItem.productCode}
                                        onChange={e => setManualItem({ ...manualItem, productCode: e.target.value })}
                                        style={{ fontSize: '0.8rem' }}
                                    />

                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Sell Price</div>
                                            <input type="text" inputMode="decimal" className="input" placeholder="Price"
                                                value={manualItem.price}
                                                onChange={e => setManualItem({ ...manualItem, price: e.target.value })} />
                                        </div>
                                        {manualItem.stockId && (
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginBottom: '2px' }}>Purchase Cost ✎</div>
                                                <input type="text" inputMode="decimal" className="input"
                                                    placeholder="Cost price"
                                                    value={manualItem.retailPrice}
                                                    style={{ borderColor: 'rgba(245,158,11,0.4)' }}
                                                    onChange={e => setManualItem({ ...manualItem, retailPrice: e.target.value })} />
                                            </div>
                                        )}
                                        <div style={{ maxWidth: '70px' }}>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Qty</div>
                                            <input type="text" inputMode="decimal" className="input"
                                                value={manualItem.qty}
                                                onChange={e => setManualItem({ ...manualItem, qty: e.target.value })} />
                                        </div>
                                        <div style={{ alignSelf: 'flex-end' }}>
                                            <button type="button" className="btn btn-secondary"
                                                onClick={() => {
                                                    if (!manualItem.name || !manualItem.price) return;
                                                    setBillItems([...billItems, {
                                                        stockId: manualItem.stockId,
                                                        name: manualItem.name,
                                                        productCode: manualItem.productCode,
                                                        quantity: Number(manualItem.qty) || 1,
                                                        // Stock items: use the (possibly overridden) purchase cost for correct margin.
                                                        // Manual items: if "no cost" ticked, treat as pure profit; otherwise cost = price (zero margin).
                                                        retailPrice: manualItem.stockId
                                                            ? (Number(manualItem.retailPrice) || 0)
                                                            : (manualItem.noCost ? 0 : Number(manualItem.price)),
                                                        customerPrice: Number(manualItem.price),
                                                    }]);
                                                    setManualItem({ stockId: '', name: '', productCode: '', price: '', retailPrice: '', qty: '1', noCost: false });
                                                }}
                                                disabled={!manualItem.name || !manualItem.price}>Add</button>
                                        </div>
                                    </div>
                                    {!manualItem.stockId && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <input type="checkbox" checked={manualItem.noCost}
                                                onChange={e => setManualItem({ ...manualItem, noCost: e.target.checked })} />
                                            No Cost / Labour (100% profit — not a real stock part)
                                        </label>
                                    )}
                                </div>

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
                                                    <td style={{ padding: '4px' }}>
                                                        <div>{item.name}</div>
                                                        {item.productCode && (
                                                            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{item.productCode}</div>
                                                        )}
                                                    </td>
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
                                {formData.paymentMode === 'CREDIT' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', color: '#ef4444', fontWeight: 700 }}>
                                        <span>Pending on Credit</span>
                                        <span>Rs. {Math.max(0, totalAmount - (Number(formData.receivedNow) || 0)).toLocaleString()}</span>
                                    </div>
                                )}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Workshop History</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <a href="/workshop/credit" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                    💳 Workshop Credit
                                </a>
                                <a href="/api/workshop/export" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                    ⬇️ Export CSV
                                </a>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '700px', overflowY: 'auto' }}>
                            {history.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No records yet.</div>
                            )}
                            {history.map(record => (
                                <React.Fragment key={record._id}>
                                <div style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: '1 1 180px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>{record.customerName}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{record.bikeNumber}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span>{new Date(record.date).toLocaleDateString()}</span>
                                            <span>· {record.serviceType}{record.items?.length > 0 ? ` + ${record.items.length} part(s)` : ''}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <span style={{ fontWeight: 700 }}>Rs. {(record.totalAmount ?? record.serviceCharges ?? 0).toLocaleString()}</span>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Margin: Rs. {(record.margin ?? 0).toLocaleString()}</span>
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                                (Labour Rs. {(record.serviceCharges ?? 0).toLocaleString()} + Parts Rs. {((record.margin ?? 0) - (record.serviceCharges ?? 0)).toLocaleString()})
                                            </span>
                                            {record.paymentMode === 'CREDIT' && (
                                                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: (record.balance ?? 0) > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: (record.balance ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
                                                    {(record.balance ?? 0) > 0 ? `Credit: Rs. ${(record.balance ?? 0).toLocaleString()} pending` : 'Credit: Paid off'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                        <button className="btn btn-secondary"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                            onClick={() => setPrintingService(record)}>🖨️</button>
                                        <button className="btn"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                                            onClick={() => editingRecord?._id === record._id ? setEditingRecord(null) : startEdit(record)}>
                                            {editingRecord?._id === record._id ? '✕ Cancel' : '✏️'}
                                        </button>
                                        <button className="btn"
                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                            onClick={() => deleteRecord(record._id!)}>🗑️</button>
                                    </div>
                                </div>

                {/* Inline Edit Panel */}
                {editingRecord?._id === record._id && (
                                    <div style={{ borderTop: '1px solid rgba(245,158,11,0.25)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f59e0b', marginBottom: '0.75rem' }}>✏️ Edit Bill</div>

                                        {/* Basic fields */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                            {([
                                                ['Customer Name', 'customerName'],
                                                ['Mobile', 'customerMobile'],
                                                ['Bike Number', 'bikeNumber'],
                                            ] as [string, keyof typeof editFields][]).map(([label, key]) => (
                                                <div key={key} className="form-group" style={{ margin: 0 }}>
                                                    <label className="label" style={{ fontSize: '0.7rem' }}>{label}</label>
                                                    <input className="input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                                                        value={editFields[key]}
                                                        onChange={e => setEditFields({ ...editFields, [key]: e.target.value })} />
                                                </div>
                                            ))}
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="label" style={{ fontSize: '0.7rem' }}>Mechanic</label>
                                                <select className="select" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                                                    value={editFields.mechanicName}
                                                    onChange={e => setEditFields({ ...editFields, mechanicName: e.target.value })}>
                                                    <option value="">— Select —</option>
                                                    {mechanics.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="label" style={{ fontSize: '0.7rem' }}>Service Type</label>
                                                <select className="select" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                                                    value={editFields.serviceType}
                                                    onChange={e => setEditFields({ ...editFields, serviceType: e.target.value })}>
                                                    {['First Service','Second Service','Third Service','Tuning','Oil','Repair','Washing','Other'].map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="label" style={{ fontSize: '0.7rem' }}>Service Charges (Rs.)</label>
                                                <input type="text" inputMode="decimal" className="input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                                                    value={editFields.serviceCharges}
                                                    onChange={e => setEditFields({ ...editFields, serviceCharges: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                            <label className="label" style={{ fontSize: '0.7rem' }}>Notes</label>
                                            <textarea className="input" style={{ fontSize: '0.8rem', minHeight: '48px' }}
                                                value={editFields.description}
                                                onChange={e => setEditFields({ ...editFields, description: e.target.value })} />
                                        </div>

                                        {/* Parts / items */}
                                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>PARTS / ITEMS</div>

                                        {/* Current items table */}
                                        {editBillItems.length > 0 && (
                                            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', marginBottom: '0.5rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <th style={{ textAlign: 'left', padding: '3px 5px' }}>Item</th>
                                                        <th style={{ textAlign: 'right', padding: '3px 5px' }}>Qty</th>
                                                        <th style={{ textAlign: 'right', padding: '3px 5px' }}>Price</th>
                                                        <th style={{ textAlign: 'right', padding: '3px 5px' }}>Total</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {editBillItems.map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '3px 5px' }}>{item.name}{item.productCode && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>{item.productCode}</span>}</td>
                                                            <td style={{ textAlign: 'right', padding: '3px 5px' }}>
                                                                <input type="number" min="1" style={{ width: '48px', fontSize: '0.78rem', textAlign: 'right', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '1px 4px', color: 'inherit' }}
                                                                    value={item.quantity}
                                                                    onChange={e => setEditBillItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) || 1 } : it))} />
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '3px 5px' }}>Rs.{item.customerPrice.toLocaleString()}</td>
                                                            <td style={{ textAlign: 'right', padding: '3px 5px' }}>Rs.{(item.customerPrice * item.quantity).toLocaleString()}</td>
                                                            <td style={{ textAlign: 'right', padding: '3px 5px' }}>
                                                                <button type="button" onClick={() => setEditBillItems(prev => prev.filter((_, i) => i !== idx))}
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* Add item row */}
                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                            <div style={{ flex: 2, minWidth: '140px', position: 'relative' }}>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Item Name</div>
                                                <input className="input" style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                                                    placeholder="Search or type..."
                                                    value={editManualItem.name}
                                                    onChange={e => {
                                                        const q = e.target.value;
                                                        setEditManualItem({ ...editManualItem, name: q, stockId: '', productCode: '', retailPrice: '' });
                                                        if (q.trim().length > 1) {
                                                            setEditSuggestions(stockList.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || s.productCode?.toLowerCase().includes(q.toLowerCase())).slice(0, 8));
                                                        } else { setEditSuggestions([]); }
                                                    }} />
                                                {editSuggestions.length > 0 && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '160px', overflowY: 'auto' }}>
                                                        {editSuggestions.map(s => (
                                                            <div key={s._id} onMouseDown={() => {
                                                                setEditManualItem({ stockId: s._id, name: s.name, productCode: s.productCode ?? '', price: String(s.customerPrice), retailPrice: String(s.retailPrice), qty: '1', noCost: false });
                                                                setEditSuggestions([]);
                                                            }} style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ fontSize: '0.8rem' }}>{s.name}{s.productCode && <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px', fontSize: '0.7rem' }}>{s.productCode}</span>}</span>
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700 }}>Rs.{s.customerPrice.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ width: '72px' }}>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Price</div>
                                                <input type="text" inputMode="decimal" className="input" style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                                                    value={editManualItem.price} placeholder="Price"
                                                    onChange={e => setEditManualItem({ ...editManualItem, price: e.target.value })} />
                                            </div>
                                            <div style={{ width: '48px' }}>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Qty</div>
                                                <input type="text" inputMode="decimal" className="input" style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                                                    value={editManualItem.qty}
                                                    onChange={e => setEditManualItem({ ...editManualItem, qty: e.target.value })} />
                                            </div>
                                            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                                                disabled={!editManualItem.name || !editManualItem.price}
                                                onClick={addEditItem}>+ Add</button>
                                        </div>

                                        {/* Edit summary */}
                                        {(() => {
                                            const sc = Number(editFields.serviceCharges) || 0;
                                            const pt = editBillItems.reduce((s, i) => s + i.customerPrice * i.quantity, 0);
                                            return (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, padding: '0.4rem 0.6rem', background: 'rgba(245,158,11,0.07)', borderRadius: '6px', marginBottom: '0.75rem' }}>
                                                    <span>New Total</span>
                                                    <span style={{ color: '#f59e0b' }}>Rs. {(sc + pt).toLocaleString()}</span>
                                                </div>
                                            );
                                        })()}

                                        <button className="btn btn-primary" style={{ fontSize: '0.8rem' }}
                                            disabled={savingEdit} onClick={handleSaveEdit}>
                                            {savingEdit ? 'Saving...' : '✅ Save Changes'}
                                        </button>
                                    </div>
                                )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {printingService && <ServiceReceipt service={printingService} onDone={() => setPrintingService(null)} />}
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
