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

    const rangeLabel = (() => {
        if (activeFilter === 'today') return `Today — ${new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`;
        if (activeFilter === 'week') return 'This Week';
        if (activeFilter === 'month') return new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
        if (!r) return 'Custom Range';
        return `${new Date(r.startDate).toLocaleDateString('en-PK')} – ${new Date(r.endDate).toLocaleDateString('en-PK')}`;
    })();

    const exportCSV = () => {
        if (!r) return;
        const rows: (string | number)[][] = [
            ['Naeem Autos — Honda DMS Report'],
            ['Period', rangeLabel],
            ['Generated', new Date().toLocaleString('en-PK')],
            [],
            ['Item', 'Value'],
            ['Bikes Sold', r.sales],
            ['Bike Margin', r.bikeProfit - r.advanceMargin],
            ['Registration Margin', r.regProfit],
            ['Workshop Sale', r.workshopRevenue],
        ];

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
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                            {rangeLabel}
                        </div>

                        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-success)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Bikes Sold</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>{r?.sales ?? 0}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>bikes</div>
                            </div>

                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Bike Margin</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>Rs. {((r?.bikeProfit ?? 0) - (r?.advanceMargin ?? 0)).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>from bike sales</div>
                            </div>

                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Registration Margin</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', lineHeight: 1 }}>Rs. {(r?.regProfit ?? 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>from registration</div>
                            </div>

                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Workshop Sale</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>Rs. {(r?.workshopRevenue ?? 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>from workshop</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
