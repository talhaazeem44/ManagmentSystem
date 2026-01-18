'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface Sale {
    id: number;
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

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.price), 0);

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
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{sales.length}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Revenue</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                            {totalRevenue.toLocaleString()} PKR
                        </p>
                    </div>
                </div>

                <div className="card">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading sales...</p>
                        </div>
                    ) : sales.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</p>
                            <p>No sales yet. Create your first sale!</p>
                            <Link href="/sales/new" className="btn btn-success" style={{ marginTop: '1rem' }}>
                                ➕ New Sale
                            </Link>
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
                                    {sales.map((sale) => (
                                        <tr key={sale.id}>
                                            <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                                            <td><strong>{sale.customer.name}</strong></td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{sale.customer.cnic}</code></td>
                                            <td>{sale.bike.model} - {sale.bike.color}</td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{sale.bike.engineNumber}</code></td>
                                            <td>{sale.bike.deliveryOrder.doNumber}</td>
                                            <td><strong>{Number(sale.price).toLocaleString()} PKR</strong></td>
                                            <td>
                                                <span className={`badge ${sale.paymentMode === 'CASH' ? 'badge-success' : 'badge-warning'}`}>
                                                    {sale.paymentMode}
                                                </span>
                                            </td>
                                            <td>
                                                <Link href={`/sales/${sale.id}`} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.75rem' }}>
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
