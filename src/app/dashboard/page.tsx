'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SaleReceipt from '@/components/SaleReceipt';
import BikeSticker from '@/components/BikeSticker';

interface SaleRecord {
    id: string;
    saleDate: string;
    price: number;
    paymentMode: string;
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder: {
            doNumber: string;
        }
    };
    customer: {
        name: string;
        cnic: string;
        mobile: string;
    };
}

interface Stats {
    range: { sales: number; revenue: number; netRevenue: number; grossProfit: number; profit: number; workshopRevenue: number; tax: number };
    allTime: { totalBikes: number; availableBikes: number; soldBikes: number };
}

export default function DashboardPage() {
    const [records, setRecords] = useState<SaleRecord[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [printingRecord, setPrintingRecord] = useState<SaleRecord | null>(null);
    const [printingSticker, setPrintingSticker] = useState<SaleRecord | null>(null);
    const [filters, setFilters] = useState({
        cnic: '',
        engineNumber: '',
        chassisNumber: '',
        doNumber: ''
    });

    const fetchDashboardData = async (searchFilters = filters) => {
        setLoading(true);
        try {
            // Fetch stats (defaults to today's range in the API)
            const statsRes = await fetch('/api/reports');
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            // Fetch records with filters
            const query = new URLSearchParams();
            if (searchFilters.cnic) query.append('cnic', searchFilters.cnic);
            if (searchFilters.engineNumber) query.append('engineNumber', searchFilters.engineNumber);
            if (searchFilters.chassisNumber) query.append('chassisNumber', searchFilters.chassisNumber);
            if (searchFilters.doNumber) query.append('doNumber', searchFilters.doNumber);

            const recordsRes = await fetch(`/api/sales?${query.toString()}`);
            if (recordsRes.ok) {
                const recordsData = await recordsRes.json();
                setRecords(recordsData);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDashboardData();
    };

    const handleReset = () => {
        const resetFilters = { cnic: '', engineNumber: '', chassisNumber: '', doNumber: '' };
        setFilters(resetFilters);
        fetchDashboardData(resetFilters);
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard</h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            Overview of your dealership operations
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <a href="/inventory/receive" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>📦 Receive Stock</a>
                        <a href="/sales/new" className="btn btn-success" style={{ padding: '0.5rem 1rem' }}>➕ New Sale</a>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card">
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Available Inventory</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats?.allTime?.availableBikes ?? '-'}</p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Sales Today</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{stats?.range?.sales ?? '-'}</p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Revenue</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {stats?.range?.revenue ? `Rs. ${stats.range.revenue.toLocaleString()}` : '-'}
                        </p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Profit</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
                            {stats?.range?.profit ? `Rs. ${stats.range.profit.toLocaleString()}` : '-'}
                        </p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Workshop Today</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                            {stats?.range?.workshopRevenue ? `Rs. ${stats.range.workshopRevenue.toLocaleString()}` : '-'}
                        </p>
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Tax Today</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-subtle)' }}>
                            {stats?.range?.tax ? `Rs. ${stats.range.tax.toLocaleString()}` : '-'}
                        </p>
                    </div>
                </div>

                {/* Advanced Search */}
                <div className="card" style={{ marginBottom: '2rem', borderBottom: '4px solid var(--color-primary)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>🔍</span> Advanced Search Filters
                    </h2>
                    <form onSubmit={handleSearch}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="label">👤 Customer CNIC</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="34601-XXXXXXXX-X"
                                    value={filters.cnic}
                                    onChange={(e) => setFilters({ ...filters, cnic: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">⚙️ Engine Number</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search engine #"
                                    value={filters.engineNumber}
                                    onChange={(e) => setFilters({ ...filters, engineNumber: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">🚲 Chassis Number</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search chassis #"
                                    value={filters.chassisNumber}
                                    onChange={(e) => setFilters({ ...filters, chassisNumber: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">📄 Delivery Order #</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Search DO #"
                                    value={filters.doNumber}
                                    onChange={(e) => setFilters({ ...filters, doNumber: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--color-border-light)', paddingTop: '1.5rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={loading}>
                                {loading ? 'Searching...' : 'Search Records'}
                            </button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.75rem 2rem' }} onClick={handleReset} disabled={loading}>
                                Reset Filters
                            </button>
                        </div>
                    </form>
                </div>

                {/* Records Table */}
                <div className="card" style={{ overflowX: 'auto' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Records</h2>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading records...</div>
                    ) : records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No records found</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>Date</th>
                                    <th style={{ padding: '1rem' }}>Customer</th>
                                    <th style={{ padding: '1rem' }}>Bike Details</th>
                                    <th style={{ padding: '1rem' }}>Price</th>
                                    <th style={{ padding: '1rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem' }}>{new Date(record.saleDate).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{record.customer.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{record.customer.cnic}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 600 }}>{record.bike.model} ({record.bike.color})</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                Eng: {record.bike.engineNumber} | Cha: {record.bike.chassisNumber}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>Rs. {record.price.toLocaleString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                                    onClick={() => {
                                                        setPrintingRecord(record);
                                                        setTimeout(() => {
                                                            window.print();
                                                            setPrintingRecord(null);
                                                        }, 100);
                                                    }}
                                                >
                                                    Print
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                                    onClick={() => {
                                                        setPrintingSticker(record);
                                                        setTimeout(() => {
                                                            window.print();
                                                            setPrintingSticker(null);
                                                        }, 100);
                                                    }}
                                                >
                                                    🏷️ Sticker
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Hidden Components for Printing */}
                {printingRecord && (
                    <div style={{ display: 'none' }}>
                        <SaleReceipt sale={printingRecord as any} />
                    </div>
                )}
                {printingSticker && (
                    <div style={{ display: 'none' }}>
                        <BikeSticker bike={printingSticker.bike as any} />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
