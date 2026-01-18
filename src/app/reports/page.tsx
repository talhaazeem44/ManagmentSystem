'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface ReportData {
    today: {
        sales: number;
        revenue: number;
    };
    allTime: {
        totalSales: number;
        totalRevenue: number;
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

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch('/api/reports');
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

    if (loading) {
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

                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Today's Performance</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales Today</h3>
                            <span style={{ fontSize: '1.5rem' }}>💰</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{data.today.sales}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>Bikes sold</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Today</h3>
                            <span style={{ fontSize: '1.5rem' }}>📈</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {data.today.revenue.toLocaleString()}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', marginTop: '2rem' }}>All-Time Statistics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Sales</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data.allTime.totalSales}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Revenue</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                            {data.allTime.totalRevenue.toLocaleString()} PKR
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
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error)' }}>{data.allTime.soldBikes}</p>
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
                    <button onClick={fetchReports} className="btn btn-secondary">
                        🔄 Refresh Data
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
