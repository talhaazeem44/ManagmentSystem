'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MARGIN_PASSWORD } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface Stats {
    range: {
        bikeProfit: number; advanceMargin: number; regProfit: number; workshopProfit: number; profit: number;
        sales: number; cashReceived: number; cashInHand: number; expenseMargin: number;
    };
    advanceBookings: { pendingCount: number; pendingMargin: number };
    chartData: { day: string; date: string; sales: number; revenue: number }[];
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

export default function ProfitPage() {
    const [unlocked, setUnlocked] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === MARGIN_PASSWORD) {
            setUnlocked(true); setError(false);
            fetchStats();
        } else {
            setError(true); setPassword('');
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports');
            if (res.ok) setStats(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const rs = stats?.range;

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

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Profit Breakdown</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Today — {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                        onClick={() => { setUnlocked(false); setPassword(''); setStats(null); }}>
                        🔒 Lock
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading...</div>
                ) : (
                    <>
                        {/* ── 4 Profit Cards ── */}
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
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Bike Margin After Deductions</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            Bike Margin &nbsp;<span style={{ color: '#ef4444' }}>− Rs. {(rs.expenseMargin).toLocaleString()} expenses</span>
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
                            {/* Sales per day */}
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

                            {/* Revenue per day */}
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

                        {/* ── Profit breakdown row ── */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Profit Sources</div>
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
