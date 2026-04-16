'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SaleReceipt from '@/components/SaleReceipt';
import BikeSticker from '@/components/BikeSticker';
import { MARGIN_PASSWORD } from '@/lib/constants';

interface SaleRecord {
    id: string;
    saleDate: string;
    price: number;
    paymentMode: string;
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder: { doNumber: string }
    };
    customer: {
        _id: string;
        name: string;
        cnic: string;
        mobile: string;
        address?: string;
    };
}

interface Stats {
    range: {
        sales: number;
        revenue: number;
        workshopRevenue: number;
        workshopProfit: number;
        unitMargin: number;
        blackMargin: number;
        regMargin: number;
        bikeMargin: number;
        totalProfit: number;
        cashReceived: number;
        registrationCollected: number;
        totalCashIn: number;
        cashToDeposit: number;
        cashInHand: number;
    };
    allTime: { totalBikes: number; availableBikes: number; soldBikes: number };
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
    return (
        <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: color || 'inherit' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
        </div>
    );
}

export default function DashboardPage() {
    const [records, setRecords] = useState<SaleRecord[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [printingRecord, setPrintingRecord] = useState<SaleRecord | null>(null);
    const [printingSticker, setPrintingSticker] = useState<SaleRecord | null>(null);
    const [editingRecord, setEditingRecord] = useState<SaleRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [marginUnlocked, setMarginUnlocked] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [filters, setFilters] = useState({ cnic: '', engineNumber: '', chassisNumber: '', doNumber: '' });

    const fetchDashboardData = async (searchFilters = filters) => {
        setLoading(true);
        try {
            const statsRes = await fetch('/api/reports');
            if (statsRes.ok) setStats(await statsRes.json());

            const query = new URLSearchParams();
            if (searchFilters.cnic) query.append('cnic', searchFilters.cnic);
            if (searchFilters.engineNumber) query.append('engineNumber', searchFilters.engineNumber);
            if (searchFilters.chassisNumber) query.append('chassisNumber', searchFilters.chassisNumber);
            if (searchFilters.doNumber) query.append('doNumber', searchFilters.doNumber);

            const recordsRes = await fetch(`/api/sales?${query.toString()}`);
            if (recordsRes.ok) setRecords(await recordsRes.json());
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchDashboardData(); };
    const handleReset = () => {
        const r = { cnic: '', engineNumber: '', chassisNumber: '', doNumber: '' };
        setFilters(r); fetchDashboardData(r);
    };

    const handleDeleteSale = async (id: string) => {
        if (!confirm('Delete this sale? Bike will be marked AVAILABLE again.')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
            if (res.ok) { alert('Sale deleted'); fetchDashboardData(); }
            else { const e = await res.json(); alert(`Failed: ${e.message}`); }
        } catch { alert('Error deleting sale'); }
        finally { setIsDeleting(false); }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === MARGIN_PASSWORD) {
            setMarginUnlocked(true);
            setPasswordError(false);
        } else {
            setPasswordError(true);
            setPasswordInput('');
        }
    };

    const rs = stats?.range;

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Dashboard</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Today — {new Date().toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <a href="/inventory/receive" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>📦 Receive</a>
                        <a href="/sales/new" className="btn btn-success" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>➕ New Sale</a>
                    </div>
                </div>

                {/* ── Section 1: Inventory & Sales ── */}
                <div style={{ marginBottom: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Sales & Inventory</div>
                <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
                    <StatCard label="Available Bikes" value={String(stats?.allTime?.availableBikes ?? '-')} />
                    <StatCard label="Bikes Sold Today" value={String(rs?.sales ?? '-')} color="var(--color-success)" />
                    <StatCard label="Registration Collected" value={rs ? `Rs. ${rs.registrationCollected.toLocaleString()}` : '-'} />
                </div>

                {/* ── Section 2: Workshop ── */}
                <div style={{ marginBottom: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Workshop Today</div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <StatCard label="Workshop Sales" value={rs ? `Rs. ${rs.workshopRevenue.toLocaleString()}` : '-'} color="#f59e0b" />
                </div>

                {/* ── Section 3: Cash Tracking ── */}
                <div style={{ marginBottom: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Cash Tracking</div>
                <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
                    <StatCard label="Total Cash Received" value={rs ? `Rs. ${rs.totalCashIn.toLocaleString()}` : '-'} color="var(--color-success)" sub="Bike price + Registration" />
                    <StatCard label="Deposit to Honda" value={rs ? `Rs. ${rs.cashToDeposit.toLocaleString()}` : '-'} color="#ef4444" sub="Purchase cost of bikes sold" />
                    <StatCard label="Cash in Hand" value={rs ? `Rs. ${rs.cashInHand.toLocaleString()}` : '-'} color="#10b981" sub="Remaining after Honda deposit" />
                </div>

                {/* ── Section 4: Profit — Password Protected ── */}
                <div style={{ marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    🔒 Profit Breakdown {marginUnlocked && <span style={{ color: 'var(--color-success)' }}>— Unlocked</span>}
                </div>
                {!marginUnlocked ? (
                    <div className="card" style={{ marginBottom: '1.5rem', maxWidth: '380px' }}>
                        <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Enter password to view profit details</p>
                        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="password" className="input" placeholder="Password" value={passwordInput}
                                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                                style={{ flex: 1, borderColor: passwordError ? '#ef4444' : undefined }} />
                            <button type="submit" className="btn btn-primary">Unlock</button>
                        </form>
                        {passwordError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>Wrong password</p>}
                    </div>
                ) : (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
                            <StatCard label="Workshop Margin" value={rs ? `Rs. ${rs.workshopProfit.toLocaleString()}` : '-'} color="var(--color-success)" sub="Labour + parts profit" />
                            <StatCard label="Bike Sales Margin" value={rs ? `Rs. ${rs.bikeMargin.toLocaleString()}` : '-'} color="var(--color-primary)" sub="Unit + registration" />
                        </div>
                        <div className="grid-5" style={{ marginBottom: '0.75rem' }}>
                            <StatCard label="Unit Margin" value={rs ? `Rs. ${(rs.unitMargin + rs.blackMargin).toLocaleString()}` : '-'} color="var(--color-success)" sub="Fixed + above list price" />
                            <StatCard label="Registration Margin" value={rs ? `Rs. ${rs.regMargin.toLocaleString()}` : '-'} color="var(--color-primary)" sub="Charged - actual cost" />
                            <StatCard label="Workshop Margin" value={rs ? `Rs. ${rs.workshopProfit.toLocaleString()}` : '-'} color="#8b5cf6" sub="Parts + labour profit" />
                            <StatCard label="Total Profit Today" value={rs ? `Rs. ${rs.totalProfit.toLocaleString()}` : '-'} color="#10b981" sub="All margins combined" />
                            <StatCard label="Cash in Hand" value={rs ? `Rs. ${rs.cashInHand.toLocaleString()}` : '-'} color="#f59e0b" sub="After Honda deposit" />
                        </div>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                            onClick={() => { setMarginUnlocked(false); setPasswordInput(''); }}>
                            🔒 Lock
                        </button>
                    </div>
                )}

                {/* ── Search ── */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>🔍 Search Records</h2>
                    <form onSubmit={handleSearch}>
                        <div className="grid-2" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="label">Customer CNIC</label>
                                <input type="text" className="input" placeholder="34601-XXXXXXXX-X"
                                    value={filters.cnic} onChange={e => setFilters({ ...filters, cnic: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Engine Number</label>
                                <input type="text" className="input" placeholder="Search engine #"
                                    value={filters.engineNumber} onChange={e => setFilters({ ...filters, engineNumber: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Chassis Number</label>
                                <input type="text" className="input" placeholder="Search chassis #"
                                    value={filters.chassisNumber} onChange={e => setFilters({ ...filters, chassisNumber: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Delivery Order #</label>
                                <input type="text" className="input" placeholder="Search DO #"
                                    value={filters.doNumber} onChange={e => setFilters({ ...filters, doNumber: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>Reset</button>
                        </div>
                    </form>
                </div>

                {/* ── Records ── */}
                <div className="card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Sale Records</h2>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                    ) : records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No records found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {records.map(record => (
                                <div key={record.id} style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: '1 1 200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>{record.customer.name}</strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{record.customer.cnic}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span>{record.bike.model} · {record.bike.color}</span>
                                            <span>· Eng: {record.bike.engineNumber}</span>
                                            <span>· {new Date(record.saleDate).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>Rs. {record.price.toLocaleString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => { setPrintingRecord(record); setTimeout(() => { window.print(); setPrintingRecord(null); }, 100); }}>🖨️</button>
                                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => { setPrintingSticker(record); setTimeout(() => { window.print(); setPrintingSticker(null); }, 100); }}>🏷️</button>
                                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#3b82f6' }}
                                            onClick={() => setEditingRecord(record)}>✏️</button>
                                        <button className="btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                            onClick={() => handleDeleteSale(record.id)} disabled={isDeleting}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {printingRecord && <div style={{ display: 'none' }}><SaleReceipt sale={printingRecord as any} /></div>}
                {printingSticker && <div style={{ display: 'none' }}><BikeSticker bike={printingSticker.bike as any} /></div>}

                {editingRecord && (
                    <EditRecordModal
                        record={editingRecord}
                        onClose={() => setEditingRecord(null)}
                        onSuccess={() => { setEditingRecord(null); fetchDashboardData(); }}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

function EditRecordModal({ record, onClose, onSuccess }: { record: SaleRecord; onClose: () => void; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        customerName: record.customer.name,
        customerMobile: record.customer.mobile,
        customerAddress: record.customer.address || '',
        engineNumber: record.bike.engineNumber,
        chassisNumber: record.bike.chassisNumber,
        price: record.price.toString()
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const saleRes = await fetch(`/api/sales/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: parseFloat(formData.price) })
            });
            const customerRes = await fetch(`/api/customers/${record.customer._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.customerName, mobile: formData.customerMobile, address: formData.customerAddress })
            });
            const bikeId = (record as any).bikeId || (record as any).bike?._id;
            const bikeRes = await fetch(`/api/bikes/${bikeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ engineNumber: formData.engineNumber, chassisNumber: formData.chassisNumber })
            });
            if (saleRes.ok && customerRes.ok && bikeRes.ok) { alert('Updated successfully'); onSuccess(); }
            else alert('Failed to update some fields');
        } catch { alert('Error during update'); }
        finally { setSubmitting(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Record</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label">Full Name</label>
                            <input type="text" className="input" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="label">Mobile</label>
                            <input type="text" className="input" value={formData.customerMobile} onChange={e => setFormData({ ...formData, customerMobile: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="label">Address</label>
                            <textarea className="input" value={formData.customerAddress} onChange={e => setFormData({ ...formData, customerAddress: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="label">Engine Number</label>
                            <input type="text" className="input" value={formData.engineNumber} onChange={e => setFormData({ ...formData, engineNumber: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="label">Chassis Number</label>
                            <input type="text" className="input" value={formData.chassisNumber} onChange={e => setFormData({ ...formData, chassisNumber: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="label">Sale Price</label>
                            <input type="number" className="input" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
