'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SaleRecord {
    id: string;
    saleDate: string;
    price: number;
    paymentMode: string;
    receivedCash?: number;
    balance?: number;
    bankTransferAmount?: number;
    bike: { model: string; color: string; engineNumber: string; chassisNumber: string; deliveryOrder: { doNumber: string } };
    customer: { _id: string; name: string; cnic: string; mobile: string; address?: string };
}

interface CreditSale {
    id: string; saleDate: string; price: number; balance: number;
    receivedCash: number; bankTransferAmount: number;
    bikeModel: string; customerName: string; customerMobile: string; cnic: string;
}

interface Stats {
    range: {
        sales: number; revenue: number; workshopRevenue: number; workshopProfit: number;
        bikeProfit: number; regProfit: number; profit: number; cashReceived: number;
        registrationCollected: number; totalCashIn: number; cashToDeposit: number;
        cashInHand: number; bankTransfer: number;
    };
    allTime: { totalBikes: number; availableBikes: number; soldBikes: number };
    creditSales: CreditSale[];
    advanceBookings: { pendingCount: number; pendingMargin: number };
    chartData: { day: string; date: string; sales: number; revenue: number }[];
}

export default function DashboardPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [records, setRecords] = useState<SaleRecord[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({ cnic: '', engineNumber: '', chassisNumber: '', doNumber: '' });

    const fetchData = async (searchFilters = filters) => {
        setLoading(true);
        try {
            const [statsRes, recordsRes] = await Promise.all([
                fetch('/api/reports'),
                fetch(`/api/sales?${new URLSearchParams(Object.fromEntries(Object.entries(searchFilters).filter(([, v]) => v))).toString()}`),
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (recordsRes.ok) setRecords(await recordsRes.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDeleteSale = async (id: string) => {
        if (!confirm('Delete this sale? Bike will be marked AVAILABLE again.')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
            if (res.ok) { showToast('Sale deleted', 'success'); fetchData(); }
            else { const e = await res.json(); showToast(`Failed: ${e.message}`, 'error'); }
        } catch { showToast('Error deleting sale', 'error'); }
        finally { setIsDeleting(false); }
    };

    const rs = stats?.range;
    const totalOutstanding = stats?.creditSales?.reduce((s, c) => s + c.balance, 0) ?? 0;

    return (
        <DashboardLayout>
            <div className="animate-fade-in">

                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a href="/inventory/receive" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>📦 Receive</a>
                        <a href="/sales/new" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>➕ New Sale</a>
                    </div>
                </div>

                {/* ── 4 KPI Cards ── */}
                <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Available Bikes</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.allTime?.availableBikes ?? '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>in stock</div>
                    </div>

                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Sold Today</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>{rs?.sales ?? '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>bikes sold</div>
                    </div>

                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Cash in Hand</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{rs ? `Rs. ${rs.cashInHand.toLocaleString()}` : '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>after deposit</div>
                    </div>

                    {/* Profit — link to profit page */}
                    <a href="/profit" className="card" style={{ padding: '1.25rem', textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Net Profit Today</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: '0.2em' }}>••••••</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.3rem', fontWeight: 600 }}>Tap to view →</div>
                    </a>
                </div>

                {/* ── Chart + Credit Summary ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    {/* Sales Chart */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Sales — Last 7 Days</div>
                        {stats?.chartData ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                        formatter={(value: any, name: any) => name === 'revenue' ? [`Rs. ${Number(value).toLocaleString()}`, 'Revenue'] : [value, 'Bikes Sold']}
                                        labelFormatter={(label) => {
                                            const d = stats.chartData.find(c => c.day === label);
                                            return d?.date || label;
                                        }}
                                    />
                                    <Bar dataKey="sales" fill="hsl(0,85%,45%)" radius={[4, 4, 0, 0]} name="sales" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading chart...</div>
                        )}
                    </div>

                    {/* Right column: Cash summary + Credit */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Today's Cash</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Received</span>
                                    <strong style={{ color: '#10b981' }}>Rs. {rs?.cashReceived.toLocaleString() ?? '-'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Bank Transfer</span>
                                    <strong style={{ color: '#3b82f6' }}>Rs. {rs?.bankTransfer.toLocaleString() ?? '-'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Registration</span>
                                    <strong style={{ color: '#8b5cf6' }}>Rs. {rs?.registrationCollected.toLocaleString() ?? '-'}</strong>
                                </div>
                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Deposit Honda</span>
                                    <strong style={{ color: '#ef4444' }}>Rs. {rs?.cashToDeposit.toLocaleString() ?? '-'}</strong>
                                </div>
                            </div>
                        </div>

                        {totalOutstanding > 0 && (
                            <div className="card" style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>Credit Outstanding</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>Rs. {totalOutstanding.toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{stats?.creditSales?.length} customer{(stats?.creditSales?.length ?? 0) !== 1 ? 's' : ''}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Credit customers detail ── */}
                {(stats?.creditSales?.length ?? 0) > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.75rem' }}>Credit Customers</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {stats!.creditSales.map(cs => (
                                <div key={cs.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cs.customerName}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>🏍️ {cs.bikeModel}</span>
                                        {cs.customerMobile && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>📞 {cs.customerMobile}</span>}
                                    </div>
                                    <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>Rs. {cs.balance.toLocaleString()} left</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Search ── */}
                <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>🔍 Search Records</div>
                    <form onSubmit={e => { e.preventDefault(); fetchData(); }}>
                        <div className="grid-4" style={{ marginBottom: '0.75rem' }}>
                            {[
                                { label: 'CNIC', key: 'cnic', ph: '34601-XXXXXXX-X' },
                                { label: 'Engine #', key: 'engineNumber', ph: 'Engine number' },
                                { label: 'Chassis #', key: 'chassisNumber', ph: 'Chassis number' },
                                { label: 'DO #', key: 'doNumber', ph: 'Delivery order #' },
                            ].map(f => (
                                <input key={f.key} type="text" className="input" placeholder={f.ph}
                                    value={(filters as any)[f.key]}
                                    onChange={e => setFilters({ ...filters, [f.key]: e.target.value })} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Search</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                                onClick={() => { const r = { cnic: '', engineNumber: '', chassisNumber: '', doNumber: '' }; setFilters(r); fetchData(r); }}>
                                Reset
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Sale Records ── */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>Sale Records</div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading...</div>
                    ) : records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No records found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {records.map(r => (
                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-elevated)', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ flex: '1 1 180px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '0.875rem' }}>{r.customer.name}</strong>
                                            {r.paymentMode !== 'CASH' && (
                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                                                    background: r.paymentMode === 'CREDIT' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
                                                    color: r.paymentMode === 'CREDIT' ? '#ef4444' : '#3b82f6' }}>
                                                    {r.paymentMode}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                                            <span>{r.bike.model} · {r.bike.color}</span>
                                            <span>· {new Date(r.saleDate).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', marginTop: '0.15rem', display: 'flex', gap: '0.6rem' }}>
                                            <strong>Rs. {r.price.toLocaleString()}</strong>
                                            {r.paymentMode === 'CREDIT' && (r.balance ?? 0) > 0 && (
                                                <span style={{ color: '#ef4444' }}>Balance: Rs. {(r.balance ?? 0).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                                        <a href={`/sales/${r.id}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>🖨️</a>
                                        <button className="btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                            onClick={() => handleDeleteSale(r.id)} disabled={isDeleting}>🗑️</button>
                                    </div>
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
