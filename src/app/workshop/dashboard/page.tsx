'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Loader from '@/components/Loader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface ServiceTypeBreakdown {
    count: number;
    revenue: number;
    margin: number;
}

interface RecentJob {
    _id: string;
    customerName: string;
    bikeNumber?: string;
    serviceType: string;
    totalAmount: number;
    margin: number;
    paymentMode?: string;
    date: string;
}

interface LowStockItem {
    _id: string;
    name: string;
    productCode?: string;
    category?: string;
    quantity: number;
}

interface WorkshopStats {
    totalRevenue: number;
    totalCollected: number;
    totalMargin: number;
    totalLabour: number;
    totalPartsRevenue: number;
    totalCashReceived: number;
    totalBankReceived: number;
    workshopExpenseTotal: number;
    netCashReceived: number;
    jobCount: number;
    avgTicket: number;
    byServiceType: Record<string, ServiceTypeBreakdown>;
    chartData: { day: string; jobs: number; revenue: number; margin: number }[];
    recentJobs: RecentJob[];
    lowStockThreshold: number;
    lowStockItems: LowStockItem[];
}

type RangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'all';

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'inherit' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
        </div>
    );
}

function rangeToDates(range: RangeKey): { startDate?: string; endDate?: string } {
    const now = new Date();
    if (range === 'all') return {};
    if (range === 'today') {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (range === 'yesterday') {
        const start = new Date(); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (range === 'week') {
        const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
        return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    // month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
}

export default function WorkshopDashboardPage() {
    const [range, setRange] = useState<RangeKey>('month');
    const [stats, setStats] = useState<WorkshopStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const { startDate, endDate } = rangeToDates(range);
        const qs = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
        fetch(`/api/workshop/stats${qs}`)
            .then(r => r.ok ? r.json() : null)
            .then(setStats)
            .finally(() => setLoading(false));
    }, [range]);

    const rangeLabel = range === 'today' ? 'Today' : range === 'yesterday' ? 'Yesterday' : range === 'week' ? 'Last 7 Days' : range === 'month' ? 'This Month' : 'All Time';

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Workshop Dashboard</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Earnings and job stats — {rangeLabel}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(['today', 'yesterday', 'week', 'month', 'all'] as RangeKey[]).map(r => (
                            <button key={r} onClick={() => setRange(r)}
                                className={r === range ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                {r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === 'week' ? '7 Days' : r === 'month' ? 'Month' : 'All Time'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading || !stats ? (
                    <Loader size={160} text="Loading workshop stats..." />
                ) : (
                    <>
                        {stats.lowStockItems.length > 0 && (
                            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.35)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                                    <strong style={{ fontSize: '0.9rem', color: '#ef4444' }}>
                                        Low Stock — {stats.lowStockItems.length} item{stats.lowStockItems.length > 1 ? 's' : ''} at or below {stats.lowStockThreshold} units
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {stats.lowStockItems.map(item => (
                                        <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.65rem', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '999px', fontSize: '0.8rem' }}>
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                            <span style={{ color: item.quantity <= 0 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                                                {item.quantity <= 0 ? 'Out of stock' : `${item.quantity} left`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                            <Card label="Total Earned (Margin)" value={`Rs. ${Math.round(stats.totalMargin).toLocaleString()}`} color="#10b981" sub={`${stats.jobCount} jobs`} />
                            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--color-primary)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Total Revenue</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>Rs. {Math.round(stats.totalCollected).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>billed Rs. {Math.round(stats.totalRevenue).toLocaleString()}</div>
                                <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginTop: '0.1rem' }}>collected only (excl. unpaid credit)</div>
                            </div>
                            <Card label="Labour Charges" value={`Rs. ${Math.round(stats.totalLabour).toLocaleString()}`} color="#f59e0b" />
                            <Card label="Parts Sold" value={`Rs. ${Math.round(stats.totalPartsRevenue).toLocaleString()}`} color="#3b82f6" />
                        </div>

                        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid #10b981' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Cash Received</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>Rs. {Math.round(stats.netCashReceived).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>gross Rs. {Math.round(stats.totalCashReceived).toLocaleString()}</div>
                                {stats.workshopExpenseTotal > 0 && (
                                    <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.1rem' }}>− expenses Rs. {Math.round(stats.workshopExpenseTotal).toLocaleString()}</div>
                                )}
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>cross-check with cash in hand</div>
                            </div>
                            <Card label="Bank Received" value={`Rs. ${Math.round(stats.totalBankReceived).toLocaleString()}`} color="#3b82f6" />
                            <Card label="Jobs Completed" value={String(stats.jobCount)} sub={rangeLabel} />
                            <Card label="Avg. Bill Value" value={`Rs. ${Math.round(stats.avgTicket).toLocaleString()}`} sub="per job" />
                        </div>

                        {/* ── Charts ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Jobs — Last 7 Days</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                            formatter={(v: any) => [v, 'Jobs']} />
                                        <Bar dataKey="jobs" fill="hsl(0,85%,45%)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue — Last 7 Days</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={stats.chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
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

                        {/* ── Breakdown by Service Type ── */}
                        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>By Service Type — {rangeLabel}</div>
                            {Object.keys(stats.byServiceType).length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No jobs in this period.</div>
                            ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                {['Service Type', 'Jobs', 'Revenue', 'Margin'].map(h => (
                                                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Service Type' ? 'left' : 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(stats.byServiceType)
                                                .sort((a, b) => b[1].revenue - a[1].revenue)
                                                .map(([type, d]) => (
                                                    <tr key={type} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{type}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{d.count}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rs. {Math.round(d.revenue).toLocaleString()}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>Rs. {Math.round(d.margin).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* ── Recent Jobs ── */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
                                Recent Jobs
                                {stats.jobCount > stats.recentJobs.length && (
                                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                        {' '}— showing {stats.recentJobs.length} of {stats.jobCount}; totals below cover only these {stats.recentJobs.length} (see cards above for the full {rangeLabel.toLowerCase()} total)
                                    </span>
                                )}
                            </div>
                            {stats.recentJobs.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No jobs in this period.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                {['Date', 'Customer', 'Bike No', 'Type', 'Payment', 'Amount', 'Margin'].map(h => (
                                                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Amount' || h === 'Margin' ? 'right' : 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentJobs.map(job => (
                                                <tr key={job._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{new Date(job.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</td>
                                                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{job.customerName}</td>
                                                    <td style={{ padding: '6px 8px' }}>{job.bikeNumber || '—'}</td>
                                                    <td style={{ padding: '6px 8px' }}>{job.serviceType}</td>
                                                    <td style={{ padding: '6px 8px' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700,
                                                            background: job.paymentMode === 'BANK_TRANSFER' ? 'rgba(59,130,246,0.12)' : job.paymentMode === 'CREDIT' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                                            color: job.paymentMode === 'BANK_TRANSFER' ? '#3b82f6' : job.paymentMode === 'CREDIT' ? '#ef4444' : '#10b981',
                                                        }}>
                                                            {job.paymentMode === 'BANK_TRANSFER' ? 'ONLINE' : job.paymentMode === 'CREDIT' ? 'CREDIT' : 'CASH'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rs. {Math.round(job.totalAmount).toLocaleString()}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>Rs. {Math.round(job.margin).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                                                <td colSpan={5} style={{ padding: '8px', fontWeight: 700 }}>Total (shown above)</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>
                                                    Rs. {Math.round(stats.recentJobs.reduce((s, j) => s + Number(j.totalAmount || 0), 0)).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                                                    Rs. {Math.round(stats.recentJobs.reduce((s, j) => s + Number(j.margin || 0), 0)).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
