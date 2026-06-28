'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MARGIN_PASSWORD } from '@/lib/constants';
import Loader from '@/components/Loader';

const CATEGORY_ICONS: Record<string, string> = {
    'Petrol': '⛽',
    'Utility Bills': '💡',
    'Parts / Market': '🔧',
    'Staff Salary': '👷',
    'Rent': '🏠',
    'Food / Tea': '☕',
    'Repair': '🛠️',
    'Home Expense': '🏡',
    'Other': '📌',
};

interface RangeData {
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
    expenseCash: number;
    expenseMargin: number;
    expensesByCategory: Record<string, number>;
    expenseList: ExpenseItem[];
    modelBreakdown?: Record<string, number>;
    startDate: string;
    endDate: string;
}

interface CashBreakdownItem {
    saleDate?: string;
    bikeModel: string;
    paymentMode: string;
    price: number;
    receivedCash: number;
    bankTransferAmount: number;
    bikeProfit: number;
    regProfit: number;
    totalProfit: number;
    standardPrice: number;
    baseMargin: number;
    extra: number;
    discount: number;
}

interface ExpenseItem {
    date: string;
    description: string;
    category: string;
    deductFrom: string;
    amount: number;
}

interface MonthlyModelRow {
    month: string;
    models: Record<string, number>;
    total: number;
}

interface ReportData {
    range: RangeData;
    cashBreakdown: CashBreakdownItem[];
    expenseList: ExpenseItem[];
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
    const [unlocked, setUnlocked] = useState(false);
    const [password, setPassword] = useState('');
    const [pwError, setPwError] = useState(false);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === MARGIN_PASSWORD) { setUnlocked(true); setPwError(false); }
        else { setPwError(true); setPassword(''); }
    };

    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<QuickFilter>('today');
    const [monthlyModels, setMonthlyModels] = useState<{ rows: MonthlyModelRow[]; models: string[] } | null>(null);

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

    useEffect(() => {
        fetchReports(startDate, endDate);
        fetch('/api/reports/model-monthly').then(r => r.ok ? r.json() : null).then(d => { if (d) setMonthlyModels(d); });
    }, []);

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

    const exportExcel = async () => {
        if (!data || !r) return;
        const XLSX = await import('xlsx');

        const profitBeforeExp = (r.bikeProfit ?? 0) + (r.regProfit ?? 0) + (r.workshopProfit ?? 0);
        const totalAllExp = (r.expenseCash ?? 0) + (r.expenseMargin ?? 0);

        // Sheet 1: Summary
        const summaryRows: (string | number)[][] = [
            ['Naeem Autos — Honda DMS Report'],
            ['Period:', rangeLabel],
            ['Generated:', new Date().toLocaleString('en-PK')],
            [],
            ['METRIC', 'AMOUNT (Rs.)'],
            ['Bikes Sold (Count)', r.sales],
            ['Bike Sales Profit', r.bikeProfit - r.advanceMargin],
            ['Advance Bookings Profit', r.advanceMargin],
            ['Registration Profit', r.regProfit],
            ['Workshop / Parts Profit', r.workshopProfit],
            [],
            ['Total Profit (before expenses)', profitBeforeExp],
            ['Expenses — from Margin', r.expenseMargin],
            ['Expenses — from Cash', r.expenseCash],
            ['Total Expenses', totalAllExp],
            [],
            ['Net Profit (after margin expenses)', r.profit],
            [],
            ['--- EXPENSE BREAKDOWN BY CATEGORY ---', ''],
            ...Object.entries(r.expensesByCategory ?? {}).map(([cat, amt]) => [cat, amt]),
        ];

        // Sheet 2: Bike Sales Detail
        const salesHeader = ['Date', 'Bike Model', 'Payment Mode', 'Sale Price', 'Cash Received', 'Bank Transfer', 'Std Price', 'Base Margin', 'Extra', 'Discount', 'Bike Profit', 'Reg Profit', 'Total Profit'];
        const salesRows = (data.cashBreakdown ?? []).map(row => [
            row.saleDate ? new Date(row.saleDate).toLocaleDateString('en-PK') : '',
            row.bikeModel,
            row.paymentMode,
            row.price,
            row.receivedCash,
            row.bankTransferAmount,
            row.standardPrice,
            row.baseMargin,
            row.extra,
            row.discount,
            row.bikeProfit,
            row.regProfit,
            row.totalProfit,
        ]);
        const totalRow = [
            '', 'TOTAL', '',
            salesRows.reduce((s, r) => s + (r[3] as number), 0),
            salesRows.reduce((s, r) => s + (r[4] as number), 0),
            salesRows.reduce((s, r) => s + (r[5] as number), 0),
            '', '',
            salesRows.reduce((s, r) => s + (r[8] as number), 0),
            salesRows.reduce((s, r) => s + (r[9] as number), 0),
            salesRows.reduce((s, r) => s + (r[10] as number), 0),
            salesRows.reduce((s, r) => s + (r[11] as number), 0),
            salesRows.reduce((s, r) => s + (r[12] as number), 0),
        ];

        // Sheet 3: Expenses
        const expHeader = ['Date', 'Description', 'Category', 'Type', 'Amount (Rs.)'];
        const expRows = (data.expenseList ?? []).map(e => [
            new Date(e.date).toLocaleDateString('en-PK'),
            e.description,
            e.category,
            e.deductFrom,
            e.amount,
        ]);

        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
        ws1['!cols'] = [{ wch: 38 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

        const ws2 = XLSX.utils.aoa_to_sheet([salesHeader, ...salesRows, totalRow]);
        ws2['!cols'] = salesHeader.map((_, i) => ({ wch: i === 1 ? 18 : 14 }));
        XLSX.utils.book_append_sheet(wb, ws2, 'Bike Sales');

        const ws3 = XLSX.utils.aoa_to_sheet([expHeader, ...expRows]);
        ws3['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Expenses');

        XLSX.writeFile(wb, `report-${rangeLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.xlsx`);
    };

    const bikeSalesMarginOnly = (r?.bikeProfit ?? 0) - (r?.advanceMargin ?? 0);
    // Net Bike Margin = same formula as Profit page (excludes reg & workshop)
    const netBikeMargin = bikeSalesMarginOnly - (r?.expenseMargin ?? 0);
    // Total net profit = netBikeMargin + advance + reg + workshop
    const totalNetProfit = netBikeMargin + (r?.advanceMargin ?? 0) + (r?.regProfit ?? 0) + (r?.workshopProfit ?? 0);
    const profitBeforeExp = (r?.bikeProfit ?? 0) + (r?.regProfit ?? 0) + (r?.workshopProfit ?? 0);
    const totalAllExp = (r?.expenseCash ?? 0) + (r?.expenseMargin ?? 0);

    if (!unlocked) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="card" style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reports</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Enter password to view reports
                        </p>
                        <form onSubmit={handleUnlock}>
                            <input type="password" className="input" placeholder="Password" value={password}
                                onChange={e => { setPassword(e.target.value); setPwError(false); }}
                                style={{ marginBottom: '0.75rem', borderColor: pwError ? '#ef4444' : undefined, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }}
                                autoFocus />
                            {pwError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Wrong password</p>}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Unlock</button>
                        </form>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.1rem' }}>Reports</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Sales, profit and expense breakdown</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {data && (<>
                            <button onClick={exportExcel} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                                📊 Export Excel
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                                🖨️ Print
                            </button>
                        </>)}
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                            onClick={() => { setUnlocked(false); setPassword(''); setData(null); }}>
                            🔒 Lock
                        </button>
                    </div>
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
                    <Loader size={160} text="Loading report..." fullPage />
                ) : (
                    <>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                            {rangeLabel}
                        </div>

                        {/* ── Profit Summary ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Bikes Sold</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1 }}>{r?.sales ?? 0}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>units</div>
                            </div>

                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Bike Profit</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>Rs. {((r?.bikeProfit ?? 0) - (r?.advanceMargin ?? 0)).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>from bike sales</div>
                            </div>

                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Reg Profit</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', lineHeight: 1 }}>Rs. {(r?.regProfit ?? 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>from registration</div>
                            </div>

                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Workshop Profit</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>Rs. {(r?.workshopProfit ?? 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>parts + service</div>
                            </div>

                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Profit Before Exp.</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4', lineHeight: 1 }}>Rs. {profitBeforeExp.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>before deductions</div>
                            </div>

                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Total Expenses</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>Rs. {totalAllExp.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>all categories</div>
                            </div>

                            <div className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${(r?.profit ?? 0) >= 0 ? '#10b981' : '#ef4444'}`, gridColumn: 'span 1' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Net Profit</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: totalNetProfit >= 0 ? '#10b981' : '#ef4444', lineHeight: 1 }}>Rs. {totalNetProfit.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>after margin expenses</div>
                            </div>
                        </div>

                        {/* ── Sales by Model ── */}
                        {r?.modelBreakdown && Object.keys(r.modelBreakdown).length > 0 && (
                            <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                    Sales by Model — {rangeLabel}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {Object.entries(r.modelBreakdown)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([model, count]) => (
                                            <div key={model} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', minWidth: '130px', flex: '1 1 130px', maxWidth: '200px' }}>
                                                <span style={{ fontSize: '1.4rem' }}>🏍️</span>
                                                <div>
                                                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{model}</div>
                                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.1 }}>{count}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>bike{count !== 1 ? 's' : ''} sold</div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                                <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(204,0,0,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Total Bikes Sold</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                                        {Object.values(r.modelBreakdown).reduce((s, c) => s + c, 0)} units
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* ── Margin Tracker ── */}
                        <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                Margin Tracker
                            </div>
                            {/* Summary rows — same formula as Profit page */}
                            {(() => {
                                const bikeSalesMargin = (r?.bikeProfit ?? 0) - (r?.advanceMargin ?? 0);
                                const advanceMargin   = r?.advanceMargin ?? 0;
                                const expMargin       = r?.expenseMargin ?? 0;
                                const netBikeMargin   = bikeSalesMargin - expMargin;   // matches Profit page "Bike Margin"
                                const regProfit       = r?.regProfit ?? 0;
                                const wsProfit        = r?.workshopProfit ?? 0;
                                const totalProfit     = netBikeMargin + advanceMargin + regProfit + wsProfit;
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                        {/* Step 1: bike sales */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.82rem' }}>Bike Sales Margin</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>Rs. {bikeSalesMargin.toLocaleString()}</span>
                                        </div>
                                        {/* Step 2: deduct margin expenses */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.82rem', color: '#ef4444' }}>Less: Margin Expenses</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>− Rs. {expMargin.toLocaleString()}</span>
                                        </div>
                                        {/* Net Bike Margin — matches Profit page exactly */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: netBikeMargin >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${netBikeMargin >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Net Bike Margin</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: netBikeMargin >= 0 ? '#10b981' : '#ef4444' }}>Rs. {netBikeMargin.toLocaleString()}</span>
                                        </div>
                                        {/* Additional income sources */}
                                        {advanceMargin > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.82rem' }}>+ Advance Bookings Margin</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>Rs. {advanceMargin.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {regProfit > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.82rem' }}>+ Registration Profit</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>Rs. {regProfit.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {wsProfit > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--color-bg-elevated)', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.82rem' }}>+ Workshop Profit</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#06b6d4' }}>Rs. {wsProfit.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {/* Grand total */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.75rem', background: totalProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `2px solid ${totalProfit >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Total Net Profit</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: totalProfit >= 0 ? '#10b981' : '#ef4444' }}>Rs. {totalProfit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })()}


                            {/* Expense category pills + list */}
                            {r?.expensesByCategory && Object.keys(r.expensesByCategory).length > 0 && (<>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Expenses by Category</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {Object.entries(r.expensesByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
                                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '20px' }}>
                                            <span>{CATEGORY_ICONS[cat] ?? '📌'}</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{cat}</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ef4444' }}>Rs. {amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </>)}

                            {/* Individual expense list */}
                            {(r?.expenseList ?? []).length > 0 && (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                {['Date', 'Category', 'Description', 'From', 'Amount'].map(h => (
                                                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Amount' ? 'right' : 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(r?.expenseList ?? []).map((e, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{new Date(e.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</td>
                                                    <td style={{ padding: '6px 8px' }}>{CATEGORY_ICONS[e.category] ?? '📌'} {e.category}</td>
                                                    <td style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>{e.description || '—'}</td>
                                                    <td style={{ padding: '6px 8px' }}>
                                                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: e.deductFrom === 'MARGIN' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: e.deductFrom === 'MARGIN' ? '#ef4444' : '#f59e0b' }}>
                                                            {e.deductFrom}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>Rs. {e.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700, background: 'var(--color-bg-elevated)' }}>
                                                <td colSpan={4} style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>Total Expenses</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444' }}>Rs. {totalAllExp.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* ── Bike Sales Table ── */}
                        {(data?.cashBreakdown ?? []).length > 0 && (
                            <div className="card" style={{ marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                    Bike & Advance Sales Detail
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                {['Date', 'Model', 'Mode', 'Price', 'Cash', 'Bank', 'Extra', 'Less', 'Bike Profit', 'Reg Profit', 'Total'].map(h => (
                                                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Date' || h === 'Model' || h === 'Mode' ? 'left' : 'right', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data?.cashBreakdown ?? []).map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                                                        {row.saleDate ? new Date(row.saleDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{row.bikeModel}</td>
                                                    <td style={{ padding: '6px 8px' }}>
                                                        <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: row.paymentMode === 'CREDIT' ? 'rgba(239,68,68,0.12)' : row.paymentMode === 'ADVANCE' ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)', color: row.paymentMode === 'CREDIT' ? '#ef4444' : row.paymentMode === 'ADVANCE' ? '#8b5cf6' : '#10b981', fontWeight: 700 }}>
                                                            {row.paymentMode}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.price.toLocaleString()}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.receivedCash.toLocaleString()}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.bankTransferAmount > 0 ? row.bankTransferAmount.toLocaleString() : '—'}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: (row.extra ?? 0) > 0 ? '#10b981' : (row.extra ?? 0) < 0 ? '#ef4444' : 'inherit' }}>
                                                        {(row.extra ?? 0) !== 0 ? row.extra.toLocaleString() : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f59e0b' }}>
                                                        {(row.discount ?? 0) > 0 ? `-${row.discount.toLocaleString()}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: row.bikeProfit >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {row.bikeProfit.toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#8b5cf6' }}>
                                                        {row.regProfit > 0 ? row.regProfit.toLocaleString() : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: row.totalProfit >= 0 ? '#06b6d4' : '#ef4444' }}>
                                                        {row.totalProfit.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                                                <td colSpan={3} style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>TOTAL</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + r.price, 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + r.receivedCash, 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + r.bankTransferAmount, 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + (r.extra ?? 0), 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f59e0b' }}>-{(data?.cashBreakdown ?? []).reduce((s, r) => s + (r.discount ?? 0), 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#10b981' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + r.bikeProfit, 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#8b5cf6' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + r.regProfit, 0).toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#06b6d4' }}>{(data?.cashBreakdown ?? []).reduce((s, r) => s + r.totalProfit, 0).toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                        {/* ── Monthly Sales by Model ── */}
                        {monthlyModels && monthlyModels.rows.length > 0 && (
                            <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                    Monthly Sales by Model — All Time
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>Month</th>
                                                {monthlyModels.models.map(m => (
                                                    <th key={m} style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>{m}</th>
                                                ))}
                                                <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-primary)', fontWeight: 700 }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...monthlyModels.rows].reverse().map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                                                    <td style={{ padding: '7px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.month}</td>
                                                    {monthlyModels.models.map(m => (
                                                        <td key={m} style={{ padding: '7px 10px', textAlign: 'center', color: row.models[m] ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
                                                            {row.models[m] ?? '—'}
                                                        </td>
                                                    ))}
                                                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--color-primary)' }}>{row.total}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-elevated)', fontWeight: 700 }}>
                                                <td style={{ padding: '8px 10px' }}>All Time</td>
                                                {monthlyModels.models.map(m => (
                                                    <td key={m} style={{ padding: '8px 10px', textAlign: 'center', color: '#10b981' }}>
                                                        {monthlyModels.rows.reduce((s, r) => s + (r.models[m] ?? 0), 0)}
                                                    </td>
                                                ))}
                                                <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-primary)', fontSize: '1rem' }}>
                                                    {monthlyModels.rows.reduce((s, r) => s + r.total, 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
