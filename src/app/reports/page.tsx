'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface ReportData {
    range: {
        sales: number;
        revenue: number;
        netRevenue: number;
        workshopRevenue: number;
        tax: number;
        grossProfit: number;
        profit: number;
        startDate: string;
        endDate: string;
    };
    allTime: {
        totalSales: number;
        totalRevenue: number;
        totalNetRevenue: number;
        totalWorkshopRevenue: number;
        totalTax: number;
        totalGrossProfit: number;
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

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to get local ISO string (YYYY-MM-DDTHH:mm)
    const getLocalISOString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return getLocalISOString(d);
    });

    const [endDate, setEndDate] = useState(() => getLocalISOString(new Date()));

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString()
            });

            const response = await fetch(`/api/reports?${query.toString()}`);
            if (response.ok) {
                const reportData = await response.json();
                setData(reportData);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchReports();
    };

    if (loading && !data) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading reports...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--color-text-muted)' }}>Failed to load reports</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reports & Analytics</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Daily and overall performance metrics
                </p>

                {/* Filtration Section */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📅 Date & Time Filter
                    </h2>
                    <form onSubmit={handleFilterSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Start (Date & Time)</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>End (Date & Time)</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Filtering...' : 'Apply Filter'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    const today = new Date();
                                    const todayStr = today.toISOString().split('T')[0];
                                    setStartDate(`${todayStr}T00:00`);
                                    setEndDate(`${todayStr}T23:59`);
                                    // fetchReports will be called by useEffect if we wanted but let's just trigger it
                                    setTimeout(() => fetchReports(), 0);
                                }}
                            >
                                Reset to Today
                            </button>
                        </div>
                    </form>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
                    {new Date(startDate).toLocaleDateString() === new Date(endDate).toLocaleDateString()
                        ? `Performance for ${new Date(startDate).toLocaleDateString()}`
                        : 'Custom Range Performance'}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales in Range</h3>
                            <span style={{ fontSize: '1.5rem' }}>💰</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{data?.range?.sales ?? 0}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>Bikes sold</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</h3>
                            <span style={{ fontSize: '1.5rem' }}>📈</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {(data?.range?.revenue ?? 0).toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Revenue (Excl. Tax)</h3>
                            <span style={{ fontSize: '1.5rem' }}>🏦</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#4f46e5' }}>
                            {(data?.range?.netRevenue ?? 0).toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workshop Revenue</h3>
                            <span style={{ fontSize: '1.5rem' }}>🛠️</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b' }}>
                            {(data?.range?.workshopRevenue ?? 0).toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax Revenue</h3>
                            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                            {(data?.range?.tax ?? 0).toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit</h3>
                            <span style={{ fontSize: '1.5rem' }}>🎯</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: '#059669' }}>
                            {(data?.range?.profit ?? 0).toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', marginTop: '2rem' }}>All-Time Statistics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Sales (Bikes)</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data.allTime.totalSales}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Workshop Total Revenue</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                            {data.allTime.totalWorkshopRevenue.toLocaleString()} PKR
                        </p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Tax Collected</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>
                            {data.allTime.totalTax.toLocaleString()} PKR
                        </p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Revenue</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {data.allTime.totalRevenue.toLocaleString()} PKR
                        </p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Profit</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
                            {data.allTime.totalProfit.toLocaleString()} PKR
                        </p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Bikes</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data.allTime.totalBikes}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Available</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{data.allTime.availableBikes}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sold</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>{data.allTime.soldBikes}</p>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', marginTop: '2rem' }}>Delivery Order Status</h2>
                <div className="card">
                    {data.deliveryOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                            <p>No delivery orders yet</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>DO Number</th>
                                        <th>Date</th>
                                        <th>Dealer</th>
                                        <th>Total Bikes</th>
                                        <th>Sold</th>
                                        <th>Remaining</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.deliveryOrders.map((dorder) => {
                                        const percentSold = (dorder.soldBikes / dorder.totalBikes) * 100;
                                        return (
                                            <tr key={dorder.doNumber}>
                                                <td><strong>{dorder.doNumber}</strong></td>
                                                <td>{new Date(dorder.date).toLocaleDateString()}</td>
                                                <td>{dorder.dealerName}</td>
                                                <td>{dorder.totalBikes}</td>
                                                <td><span className="badge badge-error">{dorder.soldBikes}</span></td>
                                                <td><span className="badge badge-success">{dorder.remainingBikes}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ flex: 1, height: '8px', background: 'var(--color-bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${percentSold}%`, height: '100%', background: percentSold === 100 ? 'var(--color-error)' : 'var(--color-warning)', transition: 'width 0.3s' }}></div>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '40px' }}>
                                                            {percentSold.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: 'var(--spacing-md)' }}>
                    <button onClick={() => window.print()} className="btn btn-primary">
                        🖨️ Print Report
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
