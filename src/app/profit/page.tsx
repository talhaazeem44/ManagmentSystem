'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MARGIN_PASSWORD } from '@/lib/constants';
import Loader from '@/components/Loader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface RangeStats {
    bikeProfit: number; advanceMargin: number; regProfit: number; workshopProfit: number; profit: number;
    sales: number; cashReceived: number; cashInHand: number; expenseMargin: number;
    registrationCollected: number; totalCashIn: number; bankTransfer: number; cashToDeposit: number; expenseCash: number; cashDepositOnly: number;
}

interface Stats {
    range: RangeStats;
    advanceBookings: { pendingCount: number; pendingMargin: number };
    chartData: { day: string; date: string; sales: number; revenue: number }[];
}

interface CollectionRecord {
    _id: string;
    amount: number;
    collectedAt: string;
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'inherit' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
        </div>
    );
}

function daysBetween(from: Date, to: Date) {
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function ProfitPage() {
    const [unlocked, setUnlocked] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);

    // margin tracker
    const [sinceStats, setSinceStats] = useState<RangeStats | null>(null);
    const [monthStats, setMonthStats] = useState<RangeStats | null>(null);
    const [lastMarginCol, setLastMarginCol] = useState<CollectionRecord | null>(null);
    const [collecting, setCollecting] = useState(false);

    // cash tracker
    const [sinceCashStats, setSinceCashStats] = useState<RangeStats | null>(null);
    const [monthCashStats, setMonthCashStats] = useState<RangeStats | null>(null);
    const [lastCashCol, setLastCashCol] = useState<CollectionRecord | null>(null);
    const [collectingCash, setCollectingCash] = useState(false);

    const [loading, setLoading] = useState(false);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === MARGIN_PASSWORD) {
            setUnlocked(true); setError(false);
            fetchAll();
        } else {
            setError(true); setPassword('');
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const nowISO = now.toISOString();

            const [todayRes, marginColRes, cashColRes] = await Promise.all([
                fetch('/api/reports'),
                fetch('/api/margin-collections'),
                fetch('/api/cash-collections'),
            ]);

            if (todayRes.ok) setStats(await todayRes.json());

            const marginColData = marginColRes.ok ? await marginColRes.json() : { last: null };
            setLastMarginCol(marginColData.last);

            const cashColData = cashColRes.ok ? await cashColRes.json() : { last: null };
            setLastCashCol(cashColData.last);

            const marginSince = marginColData.last ? new Date(marginColData.last.collectedAt).toISOString() : monthStart;
            const cashSince = cashColData.last ? new Date(cashColData.last.collectedAt).toISOString() : monthStart;

            const [marginSinceRes, monthMarginRes, cashSinceRes, monthCashRes] = await Promise.all([
                fetch(`/api/reports?startDate=${marginSince}&endDate=${nowISO}`),
                fetch(`/api/reports?startDate=${monthStart}&endDate=${nowISO}`),
                fetch(`/api/reports?startDate=${cashSince}&endDate=${nowISO}`),
                fetch(`/api/reports?startDate=${monthStart}&endDate=${nowISO}`),
            ]);

            if (marginSinceRes.ok) { const d = await marginSinceRes.json(); setSinceStats(d.range); }
            if (monthMarginRes.ok) { const d = await monthMarginRes.json(); setMonthStats(d.range); }
            if (cashSinceRes.ok)   { const d = await cashSinceRes.json();   setSinceCashStats(d.range); }
            if (monthCashRes.ok)   { const d = await monthCashRes.json();   setMonthCashStats(d.range); }
        } finally {
            setLoading(false);
        }
    };

    const handleCollectMargin = async () => {
        if (!sinceStats) return;
        const net = (sinceStats.bikeProfit - (sinceStats.advanceMargin ?? 0)) - (sinceStats.expenseMargin ?? 0);
        if (!confirm(`Mark Rs. ${net.toLocaleString()} margin as collected? Counter resets to zero.`)) return;
        setCollecting(true);
        try {
            await fetch('/api/margin-collections', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: net }),
            });
            await fetchAll();
        } finally { setCollecting(false); }
    };

    const handleCollectCash = async () => {
        if (!sinceCashStats) return;
        const net = sinceCashStats.cashReceived ?? 0;
        if (!confirm(`Mark Rs. ${net.toLocaleString()} cash as deposited? Counter resets to zero.`)) return;
        setCollectingCash(true);
        try {
            await fetch('/api/cash-collections', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: net }),
            });
            await fetchAll();
        } finally { setCollectingCash(false); }
    };

    const rs = stats?.range;

    const marginSinceDate = lastMarginCol ? new Date(lastMarginCol.collectedAt) : (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();
    const cashSinceDate   = lastCashCol   ? new Date(lastCashCol.collectedAt)   : (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })();

    const uncollectedMargin = sinceStats ? (sinceStats.bikeProfit - (sinceStats.advanceMargin ?? 0)) - (sinceStats.expenseMargin ?? 0) : 0;
    const monthMargin       = monthStats ? (monthStats.bikeProfit - (monthStats.advanceMargin ?? 0)) - (monthStats.expenseMargin ?? 0) : 0;
    const uncollectedCash   = sinceCashStats?.cashReceived ?? 0;
    const hasCashToDeposit  = uncollectedCash > 0;
    const monthCash         = monthCashStats?.cashReceived ?? 0;

    if (!unlocked) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="card" style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Profit Breakdown</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Enter password to view profit details
                        </p>
                        <form onSubmit={handleUnlock}>
                            <input type="password" className="input" placeholder="Password" value={password}
                                onChange={e => { setPassword(e.target.value); setError(false); }}
                                style={{ marginBottom: '0.75rem', borderColor: error ? '#ef4444' : undefined, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }}
                                autoFocus />
                            {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Wrong password</p>}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Unlock</button>
                        </form>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const monthName = new Date().toLocaleDateString('en-PK', { month: 'long' });

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Profit Breakdown</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Today — {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                        onClick={() => { setUnlocked(false); setPassword(''); setStats(null); setSinceStats(null); setMonthStats(null); setLastMarginCol(null); setSinceCashStats(null); setMonthCashStats(null); setLastCashCol(null); }}>
                        🔒 Lock
                    </button>
                </div>

                {loading ? (
                    <Loader size={160} text="Loading profit data..." />
                ) : (
                    <>
                        {/* ── Margin Tracker ── */}
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Margin Tracker</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '0.75rem' }}>
                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Uncollected Margin</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginBottom: '0.3rem' }}>Rs. {uncollectedMargin.toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                    {daysBetween(marginSinceDate, new Date())} {daysBetween(marginSinceDate, new Date()) === 1 ? 'day' : 'days'} since last collection
                                    {lastMarginCol ? <span> · {new Date(lastMarginCol.collectedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span> : <span> · no previous collection</span>}
                                </div>
                                <button onClick={handleCollectMargin} disabled={collecting || uncollectedMargin <= 0}
                                    className="btn btn-success" style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem', width: '100%' }}>
                                    {collecting ? '⏳ Saving...' : '✅ Collect Margin'}
                                </button>
                            </div>
                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{monthName} — Total Margin</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.3rem' }}>Rs. {monthMargin.toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{monthStats?.sales ?? 0} bikes sold this month</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Bike margin after expenses · excludes registration</div>
                            </div>
                        </div>
                        {lastMarginCol && (
                            <div style={{ padding: '0.6rem 1rem', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Last margin collected · {new Date(lastMarginCol.collectedAt).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <strong style={{ color: '#10b981' }}>Rs. {lastMarginCol.amount.toLocaleString()}</strong>
                            </div>
                        )}

                        {/* ── Cash Tracker ── */}
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Cash Tracker</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '0.75rem' }}>
                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Cash in Hand (Undeposited)</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.3rem' }}>Rs. {uncollectedCash.toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                                    {daysBetween(cashSinceDate, new Date())} {daysBetween(cashSinceDate, new Date()) === 1 ? 'day' : 'days'} since last deposit
                                    {lastCashCol ? <span> · {new Date(lastCashCol.collectedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span> : <span> · no previous deposit</span>}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <span>Cash received: Rs. {(sinceCashStats?.cashReceived ?? 0).toLocaleString()}</span>
                                    <span>Registration: Rs. {(sinceCashStats?.registrationCollected ?? 0).toLocaleString()}</span>
                                    <span>Honda deposit: − Rs. {(sinceCashStats?.cashDepositOnly ?? 0).toLocaleString()}</span>
                                    {(sinceCashStats?.expenseCash ?? 0) > 0 && <span>Expenses: − Rs. {(sinceCashStats?.expenseCash ?? 0).toLocaleString()}</span>}
                                </div>
                                <button onClick={handleCollectCash} disabled={collectingCash || !hasCashToDeposit}
                                    className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem', width: '100%', background: '#f59e0b', borderColor: '#f59e0b' }}>
                                    {collectingCash ? '⏳ Saving...' : '💰 Mark as Deposited'}
                                </button>
                            </div>
                            <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{monthName} — Total Cash</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '0.3rem' }}>Rs. {monthCash.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                                    <span>Cash from sales: Rs. {(monthCashStats?.cashReceived ?? 0).toLocaleString()}</span>
                                    <span>Registration collected: Rs. {(monthCashStats?.registrationCollected ?? 0).toLocaleString()}</span>
                                    <span>Bank transfers: Rs. {(monthCashStats?.bankTransfer ?? 0).toLocaleString()}</span>
                                    <span>Honda deposit: − Rs. {(monthCashStats?.cashDepositOnly ?? 0).toLocaleString()}</span>
                                    {(monthCashStats?.expenseCash ?? 0) > 0 && <span>Cash expenses: − Rs. {(monthCashStats?.expenseCash ?? 0).toLocaleString()}</span>}
                                </div>
                            </div>
                        </div>
                        {lastCashCol && (
                            <div style={{ padding: '0.6rem 1rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Last cash deposited · {new Date(lastCashCol.collectedAt).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <strong style={{ color: '#f59e0b' }}>Rs. {lastCashCol.amount.toLocaleString()}</strong>
                            </div>
                        )}

                        {/* ── 4 Today Profit Cards ── */}
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Today</div>
                        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                            <Card label="Bike Margin" value={rs ? `Rs. ${((rs.bikeProfit) - (rs.advanceMargin ?? 0)).toLocaleString()}` : '-'} color="var(--color-success)" sub="Sales only" />
                            <Card label="Advance Margin" value={rs ? `Rs. ${(rs.advanceMargin ?? 0).toLocaleString()}` : '-'} color="#f59e0b" sub="Today's bookings" />
                            <Card label="Registration Profit" value={rs ? `Rs. ${rs.regProfit.toLocaleString()}` : '-'} color="var(--color-primary)" sub="Charged − actual cost" />
                            <Card label="Total Profit Today" value={rs ? `Rs. ${rs.profit.toLocaleString()}` : '-'} color="#10b981" />
                        </div>

                        {/* ── Bike Margin after Expense Deductions ── */}
                        {rs && (rs.expenseMargin ?? 0) > 0 && (
                            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Bike Margin After Deductions (Today)</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            Bike Margin &nbsp;<span style={{ color: '#ef4444' }}>− Rs. {rs.expenseMargin.toLocaleString()} expenses</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>
                                        Rs. {((rs.bikeProfit - (rs.advanceMargin ?? 0)) - rs.expenseMargin).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Pending Advance Profit ── */}
                        {(stats?.advanceBookings?.pendingMargin ?? 0) > 0 && (
                            <div style={{ padding: '1rem 1.25rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f59e0b' }}>Advance Bookings — Expected Profit</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{stats?.advanceBookings?.pendingCount} bookings pending delivery</div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>Rs. {(stats?.advanceBookings?.pendingMargin ?? 0).toLocaleString()}</div>
                            </div>
                        )}

                        {/* ── Charts ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Bikes Sold — Last 7 Days</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={stats?.chartData ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                            formatter={(v: any) => [v, 'Bikes']} />
                                        <Bar dataKey="sales" fill="hsl(0,85%,45%)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Margin — Last 7 Days</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={stats?.chartData ?? []} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                            formatter={(v: any) => [`Rs. ${Number(v).toLocaleString()}`, 'Revenue']} />
                                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ── Profit breakdown ── */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Profit Sources (Today)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    { label: 'Bike Margin', value: (rs?.bikeProfit ?? 0) - (rs?.advanceMargin ?? 0), color: 'var(--color-success)', total: rs?.profit ?? 1 },
                                    { label: 'Advance Booking Margin', value: rs?.advanceMargin ?? 0, color: '#f59e0b', total: rs?.profit ?? 1 },
                                    { label: 'Registration Profit', value: rs?.regProfit ?? 0, color: 'var(--color-primary)', total: rs?.profit ?? 1 },
                                    { label: 'Workshop Profit', value: rs?.workshopProfit ?? 0, color: '#8b5cf6', total: rs?.profit ?? 1 },
                                ].filter(item => item.value > 0).map(item => (
                                    <div key={item.label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                            <span>{item.label}</span>
                                            <strong>Rs. {item.value.toLocaleString()}</strong>
                                        </div>
                                        <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: item.color, borderRadius: '99px', width: `${item.total > 0 ? Math.min(100, (item.value / item.total) * 100) : 0}%`, transition: 'width 0.5s ease' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
