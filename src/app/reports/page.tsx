'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface ReportData {
    range: {
        sales: number;
        revenue: number;
        workshopRevenue: number;
        bikeProfit: number;
        regProfit: number;
        workshopProfit: number;
        profit: number;
        cashReceived: number;
        registrationCollected: number;
        totalCashIn: number;
        bankTransfer: number;
        cashToDeposit: number;
        cashInHand: number;
        startDate: string;
        endDate: string;
    };
    allTime: {
        totalSales: number;
        totalRevenue: number;
        totalWorkshopRevenue: number;
        totalProfit: number;
        totalBikes: number;
        availableBikes: number;
        soldBikes: number;
    };
    deliveryOrders: Array<{
        doNumber: string;
        date: string;
        totalBikes: number;
        soldBikes: number;
        remainingBikes: number;
        dealerName: string;
    }>;
}

type QuickFilter = 'today' | 'week' | 'month' | 'custom';

function toLocalDatetimeStr(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
}

function getRangeDates(filter: QuickFilter): { start: Date; end: Date } {
    const now = new Date();
    if (filter === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (filter === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (filter === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    // custom — caller sets their own dates
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { start, end: new Date(now) };
}

function StatRow({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <div>
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
                {sub && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{sub}</div>}
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: color || 'inherit' }}>{value}</span>
        </div>
    );
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<QuickFilter>('today');

    const todayDates = getRangeDates('today');
    const [startDate, setStartDate] = useState(() => toLocalDatetimeStr(todayDates.start));
    const [endDate, setEndDate] = useState(() => toLocalDatetimeStr(todayDates.end));

    const fetchReports = async (start: string, end: string) => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate: new Date(start).toISOString(),
                endDate: new Date(end).toISOString(),
            });
            const res = await fetch(`/api/reports?${query}`);
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(startDate, endDate); }, []);

    const applyQuickFilter = (filter: QuickFilter) => {
        setActiveFilter(filter);
        if (filter === 'custom') return;
        const { start, end } = getRangeDates(filter);
        const s = toLocalDatetimeStr(start);
        const e = toLocalDatetimeStr(end);
        setStartDate(s);
        setEndDate(e);
        fetchReports(s, e);
    };

    const handleCustomSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        fetchReports(startDate, endDate);
    };

    const r = data?.range;
    const a = data?.allTime;

    const rangeLabel = (() => {
        if (activeFilter === 'today') return `Today — ${new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`;
        if (activeFilter === 'week') return 'This Week';
        if (activeFilter === 'month') return `${new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}`;
        if (!r) return 'Custom Range';
        return `${new Date(r.startDate).toLocaleDateString()} – ${new Date(r.endDate).toLocaleDateString()}`;
    })();

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Reports</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Sales, profit and cash flow</p>

                {/* Quick filter buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {(['today', 'week', 'month', 'custom'] as QuickFilter[]).map(f => (
                        <button key={f} onClick={() => applyQuickFilter(f)}
                            className={`btn ${activeFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                            {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
                        </button>
                    ))}
                </div>

                {/* Custom date range */}
                {activeFilter === 'custom' && (
                    <form onSubmit={handleCustomSubmit} className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                            <label className="label">From</label>
                            <input type="datetime-local" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                            <label className="label">To</label>
                            <input type="datetime-local" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Loading...' : 'Apply'}
                        </button>
                    </form>
                )}

                {loading && !data ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{rangeLabel}</div>

                        <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
                            {/* Sales & Revenue */}
                            <div className="card">
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Sales & Revenue</div>
                                <StatRow label="Bikes Sold" value={String(r?.sales ?? 0)} color="var(--color-success)" />
                                <StatRow label="Bike Revenue" value={`Rs. ${(r?.revenue ?? 0).toLocaleString()}`} sub="Sum of sale prices" />
                                <StatRow label="Workshop Revenue" value={`Rs. ${(r?.workshopRevenue ?? 0).toLocaleString()}`} color="#f59e0b" />
                                <StatRow label="Registration Collected" value={`Rs. ${(r?.registrationCollected ?? 0).toLocaleString()}`} color="#8b5cf6" />
                            </div>

                            {/* Cash Tracking */}
                            <div className="card">
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Cash Tracking</div>
                                <StatRow label="Bike Cash Received" value={`Rs. ${(r?.cashReceived ?? 0).toLocaleString()}`} color="var(--color-success)" />
                                <StatRow label="Bank Transfer" value={`Rs. ${(r?.bankTransfer ?? 0).toLocaleString()}`} color="#3b82f6" />
                                <StatRow label="Deposit to Honda" value={`Rs. ${(r?.cashToDeposit ?? 0).toLocaleString()}`} color="#ef4444" sub="Book price of bikes" />
                                <StatRow label="Cash in Hand" value={`Rs. ${(r?.cashInHand ?? 0).toLocaleString()}`} color="#10b981" sub="After Honda deposit" />
                            </div>

                            {/* Profit Breakdown */}
                            <div className="card">
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Profit Breakdown</div>
                                <StatRow label="Bike Profit" value={`Rs. ${(r?.bikeProfit ?? 0).toLocaleString()}`} color="var(--color-success)" sub="Fixed margin + extra above standard" />
                                <StatRow label="Registration Profit" value={`Rs. ${(r?.regProfit ?? 0).toLocaleString()}`} color="var(--color-primary)" sub="Charged minus actual cost" />
                                <StatRow label="Workshop Profit" value={`Rs. ${(r?.workshopProfit ?? 0).toLocaleString()}`} color="#8b5cf6" sub="Labour + parts margin" />
                                <div style={{ padding: '0.75rem 0 0' }}>
                                    <StatRow label="Total Profit" value={`Rs. ${(r?.profit ?? 0).toLocaleString()}`} color="#10b981" />
                                </div>
                            </div>

                            {/* All-Time */}
                            <div className="card">
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>All-Time</div>
                                <StatRow label="Total Bikes Sold" value={String(a?.soldBikes ?? 0)} color="var(--color-success)" />
                                <StatRow label="Available in Stock" value={String(a?.availableBikes ?? 0)} />
                                <StatRow label="Total Sales Count" value={String(a?.totalSales ?? 0)} />
                                <StatRow label="Total Revenue" value={`Rs. ${(a?.totalRevenue ?? 0).toLocaleString()}`} color="var(--color-primary)" />
                                <StatRow label="Workshop Revenue" value={`Rs. ${(a?.totalWorkshopRevenue ?? 0).toLocaleString()}`} color="#f59e0b" />
                                <div style={{ padding: '0.75rem 0 0' }}>
                                    <StatRow label="Total Profit" value={`Rs. ${(a?.totalProfit ?? 0).toLocaleString()}`} color="#10b981" />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Orders */}
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Delivery Orders</div>
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            {!data?.deliveryOrders?.length ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>No delivery orders yet</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {data.deliveryOrders.map(dorder => {
                                        const pct = dorder.totalBikes > 0 ? (dorder.soldBikes / dorder.totalBikes) * 100 : 0;
                                        return (
                                            <div key={dorder.doNumber} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-bg-elevated)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                                    <div>
                                                        <strong style={{ fontSize: '0.9rem' }}>{dorder.doNumber}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>{new Date(dorder.date).toLocaleDateString()} · {dorder.dealerName}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                                                        <span>Total: <strong>{dorder.totalBikes}</strong></span>
                                                        <span style={{ color: '#ef4444' }}>Sold: <strong>{dorder.soldBikes}</strong></span>
                                                        <span style={{ color: '#22c55e' }}>Left: <strong>{dorder.remainingBikes}</strong></span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#ef4444' : '#f59e0b', transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', minWidth: '32px' }}>{pct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button onClick={() => window.print()} className="btn btn-primary">🖨️ Print Report</button>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
