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

interface CashBreakdownItem {
    bikeModel: string; paymentMode: string; price: number;
    receivedCash: number; bankTransferAmount: number; counted: number;
    bikeProfit: number; regProfit: number; totalProfit: number;
    standardPrice: number; baseMargin: number;
    extra: number; discount: number;
}

interface Stats {
    range: {
        sales: number; revenue: number; workshopRevenue: number; workshopProfit: number;
        bikeProfit: number; regProfit: number; profit: number; cashReceived: number;
        registrationCollected: number; totalCashIn: number; cashToDeposit: number;
        expenseCash: number; cashInHand: number; bankTransfer: number; cashDepositOnly: number;
    };
    allTime: { totalBikes: number; availableBikes: number; soldBikes: number };
    creditSales: CreditSale[];
    advanceBookings: {
        pendingCount: number; pendingMargin: number;
        overdueBookings: { _id: string; customerName: string; customerMobile: string; bikeModel: string; expectedDeliveryDate: string; advancePaid: number }[];
    };
    chartData: { day: string; date: string; sales: number; revenue: number }[];
    cashBreakdown: CashBreakdownItem[];
}

interface CashDeposit {
    _id: string;
    amount: number;
    collectedAt: string;
}

export default function DashboardPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [records, setRecords] = useState<SaleRecord[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [sinceStats, setSinceStats] = useState<Stats['range'] | null>(null);
    const [lastDeposit, setLastDeposit] = useState<CashDeposit | null>(null);
    const [depositing, setDepositing] = useState(false);
    const [manualCash, setManualCash] = useState('');
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState({ cnic: '', engineNumber: '', chassisNumber: '', doNumber: '', startDate: '', endDate: '' });
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [yesterdayStats, setYesterdayStats] = useState<Stats | null>(null);
    const [showYesterdayBreakdown, setShowYesterdayBreakdown] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [customDateStats, setCustomDateStats] = useState<Stats | null>(null);
    const [showCustomBreakdown, setShowCustomBreakdown] = useState(false);
    const [loadingCustom, setLoadingCustom] = useState(false);

    const fetchData = async (searchFilters = filters) => {
        setLoading(true);
        try {
            const now = new Date().toISOString();
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
            const dateParams = { startDate: todayStart.toISOString(), endDate: todayEnd.toISOString() };
            const hasActiveSearch = Object.entries(searchFilters).some(([k, v]) => k !== 'startDate' && k !== 'endDate' && v);
            const customStart = searchFilters.startDate ? new Date(searchFilters.startDate).toISOString() : '';
            const customEnd = searchFilters.endDate ? new Date(searchFilters.endDate + 'T23:59:59').toISOString() : '';
            const resolvedDates = hasActiveSearch
                ? (customStart ? { startDate: customStart, endDate: customEnd || new Date().toISOString() } : {})
                : (customStart ? { startDate: customStart, endDate: customEnd || new Date().toISOString() } : dateParams);
            const searchParams = new URLSearchParams({
                ...resolvedDates,
                ...Object.fromEntries(Object.entries(searchFilters).filter(([k, v]) => v && k !== 'startDate' && k !== 'endDate')),
            });
            const [statsRes, recordsRes, cashColRes] = await Promise.all([
                fetch('/api/reports'),
                fetch(`/api/sales?${searchParams}`),
                fetch('/api/cash-collections'),
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (recordsRes.ok) setRecords(await recordsRes.json());

            const colData = cashColRes.ok ? await cashColRes.json() : { last: null };
            setLastDeposit(colData.last);

            const sinceDate = colData.last
                ? new Date(colData.last.collectedAt).toISOString()
                : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

            const sinceRes = await fetch(`/api/reports?startDate=${sinceDate}&endDate=${now}`);
            if (sinceRes.ok) { const d = await sinceRes.json(); setSinceStats(d.range); }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStart = new Date(yesterday); yStart.setHours(0, 0, 0, 0);
            const yEnd = new Date(yesterday); yEnd.setHours(23, 59, 59, 999);
            const yRes = await fetch(`/api/reports?startDate=${yStart.toISOString()}&endDate=${yEnd.toISOString()}`);
            if (yRes.ok) setYesterdayStats(await yRes.json());
        } finally {
            setLoading(false);
        }
    };

    const handleDeposit = async () => {
        if (!sinceStats) return;
        const extra = Number(manualCash) || 0;
        const cashInHand = (sinceStats.cashReceived ?? 0) + extra;
        if (!confirm(`Mark Rs. ${cashInHand.toLocaleString()} as deposited to bank? Cash counter resets to zero.`)) return;
        setDepositing(true);
        try {
            await fetch('/api/cash-collections', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: cashInHand }),
            });
            showToast('Cash marked as deposited', 'success');
            setManualCash('');
            await fetchData();
        } catch {
            showToast('Failed to save deposit', 'error');
        } finally {
            setDepositing(false);
        }
    };

    const fetchCustomDateBreakdown = async (date: string) => {
        if (!date) { setCustomDateStats(null); return; }
        setLoadingCustom(true);
        try {
            const d = new Date(date);
            const start = new Date(d); start.setHours(0, 0, 0, 0);
            const end = new Date(d); end.setHours(23, 59, 59, 999);
            const res = await fetch(`/api/reports?startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
            if (res.ok) setCustomDateStats(await res.json());
            else setCustomDateStats(null);
        } finally {
            setLoadingCustom(false);
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

                {/* ── Overdue Advance Bookings Alert ── */}
                {(stats?.advanceBookings?.overdueBookings?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                            <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                {stats!.advanceBookings.overdueBookings.length} Advance Booking{stats!.advanceBookings.overdueBookings.length > 1 ? 's' : ''} Overdue
                            </strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {stats!.advanceBookings.overdueBookings.map(b => (
                                <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem' }}>
                                    <span>
                                        <strong>{b.customerName}</strong>
                                        {b.bikeModel && <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.4rem' }}>🏍️ {b.bikeModel}</span>}
                                        {b.customerMobile && <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.4rem' }}>📞 {b.customerMobile}</span>}
                                    </span>
                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                        Due: {new Date(b.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Sales &amp; Margin — Last 7 Days</div>
                        {stats?.chartData ? (
                            <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                        formatter={(value: any, name: any) => name === 'revenue' ? [`Rs. ${Number(value).toLocaleString()}`, 'Margin'] : [value, 'Bikes Sold']}
                                        labelFormatter={(label) => {
                                            const d = stats.chartData.find(c => c.day === label);
                                            return d?.date || label;
                                        }}
                                    />
                                    <Bar dataKey="sales" fill="hsl(0,85%,45%)" radius={[4, 4, 0, 0]} name="sales" />
                                </BarChart>
                            </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading chart...</div>
                        )}
                    </div>

                    {/* Right column: Cash summary + Credit */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="card" style={{ padding: '1.25rem', flex: 1, borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Cash in Hand</div>
                                {lastDeposit && (
                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                        Last: {new Date(lastDeposit.collectedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.75rem' }}>
                                Rs. {((sinceStats?.cashReceived ?? 0) + (Number(manualCash) || 0)).toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Received</span>
                                    <strong style={{ color: '#10b981' }}>Rs. {(sinceStats?.cashReceived ?? 0).toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Bank Transfer</span>
                                    <strong style={{ color: '#3b82f6' }}>Rs. {(sinceStats?.bankTransfer ?? 0).toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Registration</span>
                                    <strong style={{ color: '#8b5cf6' }}>Rs. {(sinceStats?.registrationCollected ?? 0).toLocaleString()}</strong>
                                </div>
                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.3rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Honda Deposit</span>
                                    <strong style={{ color: '#ef4444' }}>− Rs. {(sinceStats?.cashDepositOnly ?? 0).toLocaleString()}</strong>
                                </div>
                                {(Number(manualCash) || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#f59e0b' }}>Manual Addition</span>
                                        <strong style={{ color: '#f59e0b' }}>+ Rs. {(Number(manualCash)).toLocaleString()}</strong>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Add extra cash (optional)"
                                    value={manualCash}
                                    onChange={e => setManualCash(e.target.value)}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                                    min="0"
                                />
                            </div>
                            <button
                                onClick={handleDeposit}
                                disabled={depositing || ((sinceStats?.cashReceived ?? 0) + (Number(manualCash) || 0)) <= 0}
                                className="btn"
                                style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: depositing ? 'not-allowed' : 'pointer', opacity: (sinceStats?.cashReceived ?? 0) <= 0 ? 0.5 : 1 }}>
                                {depositing ? '⏳ Saving...' : '🏦 Deposit to Bank'}
                            </button>
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

                {/* ── Cash & Margin Breakdown Date Filter ── */}
                <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                            Cash &amp; Margin — Filter by Date
                        </span>
                        <input
                            type="date"
                            className="input"
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem', maxWidth: '180px' }}
                            value={customDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => {
                                setCustomDate(e.target.value);
                                setShowCustomBreakdown(true);
                                fetchCustomDateBreakdown(e.target.value);
                            }}
                        />
                        {customDate && !loadingCustom && (
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => { setCustomDate(''); setCustomDateStats(null); setShowCustomBreakdown(false); }}>
                                Clear
                            </button>
                        )}
                        {loadingCustom && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Loading...</span>}
                        {customDate && !loadingCustom && (customDateStats?.cashBreakdown?.length ?? 0) === 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No sales on this date</span>
                        )}
                    </div>

                    {showCustomBreakdown && (customDateStats?.cashBreakdown?.length ?? 0) > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                {new Date(customDate).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {customDateStats!.cashBreakdown.length} sale{customDateStats!.cashBreakdown.length !== 1 ? 's' : ''}
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-bg-elevated)' }}>
                                            {['#', 'Model', 'Mode', 'Sale Price', 'Std Price', 'Rcvd Cash', 'Bank Xfer', 'Base Margin', 'Extra', 'Less', 'Bike Profit', 'Reg Profit', 'Total Profit'].map(h => (
                                                <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customDateStats!.cashBreakdown.map((row, i) => {
                                            const extra = row.extra ?? 0;
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)' }}>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{row.bikeModel}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px',
                                                            background: row.paymentMode === 'ADVANCE' ? 'rgba(245,158,11,0.15)' : row.paymentMode === 'CREDIT' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                                            color: row.paymentMode === 'ADVANCE' ? '#f59e0b' : row.paymentMode === 'CREDIT' ? '#ef4444' : '#10b981' }}>
                                                            {row.paymentMode}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{row.price.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.standardPrice.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#10b981' }}>{row.receivedCash.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#3b82f6' }}>{row.bankTransferAmount > 0 ? row.bankTransferAmount.toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.baseMargin.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: extra > 0 ? '#10b981' : extra < 0 ? '#ef4444' : 'var(--color-text-muted)' }}>{extra > 0 ? `+${extra.toLocaleString()}` : extra < 0 ? extra.toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#f59e0b' }}>{(row.discount ?? 0) > 0 ? `-${(row.discount ?? 0).toLocaleString()}` : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>{row.bikeProfit.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-primary)' }}>{row.regProfit > 0 ? row.regProfit.toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{row.totalProfit.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700, background: 'var(--color-bg-elevated)' }}>
                                            <td colSpan={5} style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontSize: '0.8rem' }}>TOTALS</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#10b981' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + r.receivedCash, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#3b82f6' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + r.bankTransferAmount, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + r.baseMargin, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + (r.extra ?? 0), 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#f59e0b' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + (r.discount ?? 0), 0) > 0 ? `-${customDateStats!.cashBreakdown.reduce((s, r) => s + (r.discount ?? 0), 0).toLocaleString()}` : '-'}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: 'var(--color-success)' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + r.bikeProfit, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: 'var(--color-primary)' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + r.regProfit, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#10b981' }}>{customDateStats!.cashBreakdown.reduce((s, r) => s + r.totalProfit, 0).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Cash Breakdown Tables ── */}
                {[
                    { label: 'Today', data: stats?.cashBreakdown, show: showBreakdown, toggle: () => setShowBreakdown(p => !p) },
                    { label: 'Yesterday', data: yesterdayStats?.cashBreakdown, show: showYesterdayBreakdown, toggle: () => setShowYesterdayBreakdown(p => !p) },
                ].map(({ label, data, show, toggle }) => (data?.length ?? 0) > 0 && (
                    <div key={label} className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: show ? '0.75rem' : 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                                {label} — Cash &amp; Margin Breakdown ({data!.length} sales)
                            </div>
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={toggle}>
                                {show ? 'Hide ▲' : 'Show ▼'}
                            </button>
                        </div>
                        {show && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-bg-elevated)' }}>
                                            {['#', 'Model', 'Mode', 'Sale Price', 'Std Price', 'Rcvd Cash', 'Bank Xfer', 'Base Margin', 'Extra', 'Less', 'Bike Profit', 'Reg Profit', 'Total Profit'].map(h => (
                                                <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data!.map((row, i) => {
                                            const extra = row.extra ?? 0;
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)' }}>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 600 }}>{row.bikeModel}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px',
                                                            background: row.paymentMode === 'ADVANCE' ? 'rgba(245,158,11,0.15)' : row.paymentMode === 'CREDIT' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                                            color: row.paymentMode === 'ADVANCE' ? '#f59e0b' : row.paymentMode === 'CREDIT' ? '#ef4444' : '#10b981' }}>
                                                            {row.paymentMode}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>{row.price.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.standardPrice.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#10b981' }}>{row.receivedCash.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#3b82f6' }}>{row.bankTransferAmount > 0 ? row.bankTransferAmount.toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.baseMargin.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: extra > 0 ? '#10b981' : extra < 0 ? '#ef4444' : 'var(--color-text-muted)' }}>{extra > 0 ? `+${extra.toLocaleString()}` : extra < 0 ? extra.toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#f59e0b' }}>{(row.discount ?? 0) > 0 ? `-${(row.discount ?? 0).toLocaleString()}` : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>{row.bikeProfit.toLocaleString()}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--color-primary)' }}>{row.regProfit > 0 ? row.regProfit.toLocaleString() : '-'}</td>
                                                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{row.totalProfit.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700, background: 'var(--color-bg-elevated)' }}>
                                            <td colSpan={5} style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontSize: '0.8rem' }}>TOTALS</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#10b981' }}>{data!.reduce((s, r) => s + r.receivedCash, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#3b82f6' }}>{data!.reduce((s, r) => s + r.bankTransferAmount, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{data!.reduce((s, r) => s + r.baseMargin, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>{data!.reduce((s, r) => s + (r.extra ?? 0), 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#f59e0b' }}>{data!.reduce((s, r) => s + (r.discount ?? 0), 0) > 0 ? `-${data!.reduce((s, r) => s + (r.discount ?? 0), 0).toLocaleString()}` : '-'}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: 'var(--color-success)' }}>{data!.reduce((s, r) => s + r.bikeProfit, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: 'var(--color-primary)' }}>{data!.reduce((s, r) => s + r.regProfit, 0).toLocaleString()}</td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#10b981' }}>{data!.reduce((s, r) => s + r.totalProfit, 0).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                ))}

                {/* ── Search ── */}
                <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>🔍 Search Records</div>
                    <form onSubmit={e => { e.preventDefault(); fetchData(); }}>
                        <div className="grid-4" style={{ marginBottom: '0.75rem' }}>
                            {[
                                { key: 'cnic', ph: 'CNIC' },
                                { key: 'engineNumber', ph: 'Engine #' },
                                { key: 'chassisNumber', ph: 'Chassis #' },
                                { key: 'doNumber', ph: 'DO #' },
                            ].map(f => (
                                <input key={f.key} type="text" className="input" placeholder={f.ph}
                                    value={(filters as any)[f.key]}
                                    onChange={e => setFilters({ ...filters, [f.key]: e.target.value })} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Date Range:</span>
                            <input type="date" className="input" style={{ maxWidth: '160px', fontSize: '0.8rem' }}
                                value={filters.startDate}
                                onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>to</span>
                            <input type="date" className="input" style={{ maxWidth: '160px', fontSize: '0.8rem' }}
                                value={filters.endDate}
                                onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Search</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                                onClick={() => { const r = { cnic: '', engineNumber: '', chassisNumber: '', doNumber: '', startDate: '', endDate: '' }; setFilters(r); fetchData(r); }}>
                                Reset
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Sale Records ── */}
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>Today's Sales</div>
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
