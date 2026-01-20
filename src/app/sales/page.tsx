'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface Sale {
    id: string;
    _id: string;
    saleDate: string;
    price: number;
    registrationCost: number | null;
    paymentMode: string;
    receiptNumber: string | null;
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder: {
            doNumber: string;
        };
    };
    customer: {
        name: string;
        cnic: string;
        mobile: string | null;
    };
}

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [doFilter, setDoFilter] = useState<string>('ALL');
    const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await fetch('/api/sales');
            if (response.ok) {
                const data = await response.json();
                setSales(data);
            }
        } catch (error) {
            console.error('Failed to fetch sales:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique DO numbers and payment modes
    const uniqueDOs = Array.from(new Set(sales.map(sale => sale.bike?.deliveryOrder?.doNumber).filter(Boolean)));
    const uniquePaymentModes = Array.from(new Set(sales.map(sale => sale.paymentMode)));

    const filteredSales = sales.filter(sale => {
        // DO filter
        if (doFilter !== 'ALL' && sale.bike?.deliveryOrder?.doNumber !== doFilter) return false;

        // Payment mode filter
        if (paymentFilter !== 'ALL' && sale.paymentMode !== paymentFilter) return false;

        // Date range filter
        if (startDate) {
            const saleDate = new Date(sale.saleDate);
            const start = new Date(startDate);
            if (saleDate < start) return false;
        }
        if (endDate) {
            const saleDate = new Date(sale.saleDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (saleDate > end) return false;
        }

        // Search query (customer name, CNIC, bike model)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = sale.customer?.name?.toLowerCase().includes(query);
            const matchesCnic = sale.customer?.cnic?.toLowerCase().includes(query);
            const matchesModel = sale.bike?.model?.toLowerCase().includes(query);
            if (!matchesName && !matchesCnic && !matchesModel) return false;
        }

        return true;
    });

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.price), 0);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sales History</h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            View all completed sales
                        </p>
                    </div>
                    <Link href="/sales/new" className="btn btn-success">
                        ➕ New Sale
                    </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Sales</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{filteredSales.length}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Revenue</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                            {totalRevenue.toLocaleString()} PKR
                        </p>
                    </div>
                </div>

                <div className="card">
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>Filters</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <div>
                                <label className="label">Search</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Customer name, CNIC, Model..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">DO Number</label>
                                <select
                                    className="select"
                                    value={doFilter}
                                    onChange={(e) => setDoFilter(e.target.value)}
                                >
                                    <option value="ALL">All DOs</option>
                                    {uniqueDOs.map(doNum => (
                                        <option key={doNum} value={doNum}>{doNum}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Payment Mode</label>
                                <select
                                    className="select"
                                    value={paymentFilter}
                                    onChange={(e) => setPaymentFilter(e.target.value)}
                                >
                                    <option value="ALL">All Modes</option>
                                    {uniquePaymentModes.map(mode => (
                                        <option key={mode} value={mode}>{mode}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Start Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">End Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    setDoFilter('ALL');
                                    setPaymentFilter('ALL');
                                    setSearchQuery('');
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.875rem' }}
                            >
                                🔄 Clear Filters
                            </button>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                Showing {filteredSales.length} of {sales.length} sales
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading sales...</p>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</p>
                            <p>No sales found matching your filters.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>CNIC</th>
                                        <th>Bike</th>
                                        <th>Engine #</th>
                                        <th>DO Number</th>
                                        <th>Price</th>
                                        <th>Payment</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSales.map((sale) => (
                                        <tr key={sale._id}>
                                            <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                                            <td><strong>{sale.customer?.name || 'N/A'}</strong></td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{sale.customer?.cnic || 'N/A'}</code></td>
                                            <td>{sale.bike?.model || 'N/A'} - {sale.bike?.color || ''}</td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{sale.bike?.engineNumber || 'N/A'}</code></td>
                                            <td>{sale.bike?.deliveryOrder?.doNumber || 'N/A'}</td>
                                            <td><strong>{Number(sale.price).toLocaleString()} PKR</strong></td>
                                            <td>
                                                <span className={`badge ${sale.paymentMode === 'CASH' ? 'badge-success' : 'badge-warning'}`}>
                                                    {sale.paymentMode}
                                                </span>
                                            </td>
                                            <td>
                                                <Link href={`/sales/${sale._id}`} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.75rem' }}>
                                                    View Receipt
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
