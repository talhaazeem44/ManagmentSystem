'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface ReportData {
    range: {
        sales: number;
        revenue: number;
        workshopRevenue: number;
        bikeProfit: number;
        advanceMargin: number;
        regProfit: number;
        workshopProfit: number;
        profit: number;
        cashReceived: number;
        registrationCollected: number;
        bankTransfer: number;
        expenseMargin: number;
        startDate: string;
        endDate: string;
    };
    allTime: {
        totalRevenue: number;
        totalWorkshopRevenue: number;
        totalProfit: number;
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
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { start, end: new Date(now) };
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.875rem' }}>{label}</span>
            <span style={{ fontWeight: bold ? 800 : 700, fontSize: '0.95rem', color: color || 'inherit' }}>{value}</span>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.6rem', letterSpacing: '0.06em' }}>
            {children}
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

    const r = data?.range;
    const a = data?.allTime;

    const rangeLabel = (() => {
        if (activeFilter === 'today') return `Today — ${new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`;
        if (activeFilter === 'week') return 'This Week';
        if (activeFilter === 'month') return new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
        if (!r) return 'Custom Range';
        return `${new Date(r.startDate).toLocaleDateString('en-PK')} – ${new Date(r.endDate).toLocaleDateString('en-PK')}`;
    })();

    const exportCSV = () => {
        if (!r || !a) return;
        const rows: (string | number)[][] = [
            ['Naeem Autos — Honda DMS Report'],
            ['Period', rangeLabel],
            ['Generated', new Date().toLocaleString('en-PK')],
            [],
            ['=== SALES & REVENUE ==='],
            ['Item', 'Value (Rs.)'],
            ['Bikes Sold', r.sales],
            ['Bike Revenue', r.revenue],
            ['Workshop Revenue', r.workshopRevenue],
            ['Registration Collected', r.registrationCollected],
            [],
            ['=== CASH TRACKING ==='],
            ['Item', 'Value (Rs.)'],
            ['Cash Received', r.cashReceived],
            ['Bank Transfer', r.bankTransfer],
            ['Total Cash In', r.cashReceived + r.bankTransfer + r.registrationCollected],
            [],
            ['=== PROFIT BREAKDOWN ==='],
            ['Item', 'Value (Rs.)'],
            ['Bike Margin (Sales)', r.bikeProfit - r.advanceMargin],
            ['Advance Booking Margin', r.advanceMargin],
            ['Registration Profit', r.regProfit],
            ['Workshop Profit', r.workshopProfit],
            ...(r.expenseMargin > 0 ? [['Expenses Deducted', -r.expenseMargin]] : []),
            ['TOTAL PROFIT', r.profit],
            [],
            ['=== ALL-TIME ==='],
            ['Item', 'Value'],
            ['Total Bikes Sold', a.soldBikes],
            ['Available in Stock', a.availableBikes],
            ['Total Revenue (Rs.)', a.totalRevenue],
            ['Workshop Revenue (Rs.)', a.totalWorkshopRevenue],
            ['Total Profit (Rs.)', a.totalProfit],
        ];

        if (data?.deliveryOrders?.length) {
            rows.push([], ['=== DELIVERY ORDERS ==='], ['DO Number', 'Date', 'Dealer', 'Total Bikes', 'Sold', 'Remaining', '% Sold']);
            data.deliveryOrders.forEach(d => {
                const pct = d.totalBikes > 0 ? ((d.soldBikes / d.totalBikes) * 100).toFixed(0) + '%' : '0%';
                rows.push([d.doNumber, new Date(d.date).toLocaleDateString('en-PK'), d.dealerName, d.totalBikes, d.soldBikes, d.remainingBikes, pct]);
            });
        }

        const csv = rows.map(row =>
            row.map(cell => (typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) ? `"${cell.replace(/"/g, '""')}"` : String(cell ?? ''))).join(',')
        ).join('\r\n');

        const bom = '﻿'; // UTF-8 BOM so Excel reads Urdu/numbers correctly
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${rangeLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.1rem' }}>Reports</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Sales, profit and cash flow</p>
                    </div>
                    {data && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={exportCSV} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                                📊 Export Excel
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                                🖨️ Print
                            </button>
                        </div>
                    )}
                </div>

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
                    <form onSubmit={e => { e.preventDefault(); fetchReports(startDate, endDate); }}
                        className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                            {rangeLabel}
                        </div>

                        <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

                            {/* Sales & Revenue */}
                            <div className="card">
                                <SectionTitle>Sales & Revenue</SectionTitle>
                                <Row label="Bikes Sold" value={String(r?.sales ?? 0)} color="var(--color-success)" bold />
                                <Row label="Bike Revenue" value={`Rs. ${(r?.revenue ?? 0).toLocaleString()}`} />
                                <Row label="Workshop Revenue" value={`Rs. ${(r?.workshopRevenue ?? 0).toLocaleString()}`} color="#f59e0b" />
                                <Row label="Registration Collected" value={`Rs. ${(r?.registrationCollected ?? 0).toLocaleString()}`} color="#8b5cf6" />
                            </div>

                            {/* Cash Tracking — no Honda deposit */}
                            <div className="card">
                                <SectionTitle>Cash Tracking</SectionTitle>
                                <Row label="Cash Received" value={`Rs. ${(r?.cashReceived ?? 0).toLocaleString()}`} color="var(--color-success)" />
                                <Row label="Bank Transfer" value={`Rs. ${(r?.bankTransfer ?? 0).toLocaleString()}`} color="#3b82f6" />
                                <Row label="Registration Collected" value={`Rs. ${(r?.registrationCollected ?? 0).toLocaleString()}`} color="#8b5cf6" />
                                <Row
                                    label="Total Cash In"
                                    value={`Rs. ${((r?.cashReceived ?? 0) + (r?.bankTransfer ?? 0) + (r?.registrationCollected ?? 0)).toLocaleString()}`}
                                    color="#10b981"
                                    bold
                                />
                            </div>

                            {/* Profit Breakdown */}
                            <div className="card">
                                <SectionTitle>Profit Breakdown</SectionTitle>
                                <Row label="Bike Margin" value={`Rs. ${((r?.bikeProfit ?? 0) - (r?.advanceMargin ?? 0)).toLocaleString()}`} color="var(--color-success)" />
                                <Row label="Advance Booking Margin" value={`Rs. ${(r?.advanceMargin ?? 0).toLocaleString()}`} color="#f59e0b" />
                                <Row label="Registration Profit" value={`Rs. ${(r?.regProfit ?? 0).toLocaleString()}`} color="var(--color-primary)" />
                                <Row label="Workshop Profit" value={`Rs. ${(r?.workshopProfit ?? 0).toLocaleString()}`} color="#8b5cf6" />
                                {(r?.expenseMargin ?? 0) > 0 && (
                                    <Row label="Expenses Deducted" value={`− Rs. ${(r?.expenseMargin ?? 0).toLocaleString()}`} color="#ef4444" />
                                )}
                                <div style={{ paddingTop: '0.5rem' }}>
                                    <Row label="Total Profit" value={`Rs. ${(r?.profit ?? 0).toLocaleString()}`} color="#10b981" bold />
                                </div>
                            </div>

                            {/* All-Time */}
                            <div className="card">
                                <SectionTitle>All-Time</SectionTitle>
                                <Row label="Total Bikes Sold" value={String(a?.soldBikes ?? 0)} color="var(--color-success)" />
                                <Row label="Available in Stock" value={String(a?.availableBikes ?? 0)} />
                                <Row label="Total Revenue" value={`Rs. ${(a?.totalRevenue ?? 0).toLocaleString()}`} color="var(--color-primary)" />
                                <Row label="Workshop Revenue" value={`Rs. ${(a?.totalWorkshopRevenue ?? 0).toLocaleString()}`} color="#f59e0b" />
                                <div style={{ paddingTop: '0.5rem' }}>
                                    <Row label="Total Profit" value={`Rs. ${(a?.totalProfit ?? 0).toLocaleString()}`} color="#10b981" bold />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Orders */}
                        {(data?.deliveryOrders?.length ?? 0) > 0 && (
                            <>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
                                    Delivery Orders
                                </div>
                                <div className="card" style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                    {['DO Number', 'Date', 'Dealer', 'Total', 'Sold', 'Remaining', 'Progress'].map(h => (
                                                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data!.deliveryOrders.map((d, i) => {
                                                    const pct = d.totalBikes > 0 ? (d.soldBikes / d.totalBikes) * 100 : 0;
                                                    return (
                                                        <tr key={d.doNumber} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 ? 'var(--color-bg-elevated)' : 'transparent' }}>
                                                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{d.doNumber}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-muted)' }}>{new Date(d.date).toLocaleDateString('en-PK')}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem' }}>{d.dealerName}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{d.totalBikes}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{d.soldBikes}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>{d.remainingBikes}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', minWidth: '120px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#ef4444' : '#f59e0b' }} />
                                                                    </div>
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', minWidth: '30px' }}>{pct.toFixed(0)}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
