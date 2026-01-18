'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Bike {
    id: number;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
    status: string;
    deliveryOrder: {
        doNumber: string;
        date: string;
    };
}

export default function InventoryPage() {
    const [bikes, setBikes] = useState<Bike[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('ALL');

    useEffect(() => {
        fetchBikes();
    }, []);

    const fetchBikes = async () => {
        try {
            const response = await fetch('/api/bikes');
            if (response.ok) {
                const data = await response.json();
                setBikes(data);
            }
        } catch (error) {
            console.error('Failed to fetch bikes:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBikes = bikes.filter(bike => {
        if (filter === 'ALL') return true;
        return bike.status === filter;
    });

    const stats = {
        total: bikes.length,
        available: bikes.filter(b => b.status === 'AVAILABLE').length,
        sold: bikes.filter(b => b.status === 'SOLD').length
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Inventory</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    View and manage all bikes in stock
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.total}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Available</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{stats.available}</p>
                    </div>
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sold</p>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error)' }}>{stats.sold}</p>
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>All Bikes</h2>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button
                                onClick={() => setFilter('ALL')}
                                className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('AVAILABLE')}
                                className={`btn ${filter === 'AVAILABLE' ? 'btn-success' : 'btn-secondary'}`}
                                style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                            >
                                Available
                            </button>
                            <button
                                onClick={() => setFilter('SOLD')}
                                className={`btn ${filter === 'SOLD' ? 'btn-secondary' : 'btn-secondary'}`}
                                style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                            >
                                Sold
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading inventory...</p>
                        </div>
                    ) : filteredBikes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</p>
                            <p>No bikes found. Start by receiving stock.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>DO Number</th>
                                        <th>Model</th>
                                        <th>Color</th>
                                        <th>Engine Number</th>
                                        <th>Chassis Number</th>
                                        <th>Status</th>
                                        <th>Received Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBikes.map((bike) => (
                                        <tr key={bike.id}>
                                            <td>{bike.deliveryOrder.doNumber}</td>
                                            <td><strong>{bike.model}</strong></td>
                                            <td>{bike.color}</td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{bike.engineNumber}</code></td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{bike.chassisNumber}</code></td>
                                            <td>
                                                <span className={`badge ${bike.status === 'AVAILABLE' ? 'badge-success' : 'badge-error'}`}>
                                                    {bike.status}
                                                </span>
                                            </td>
                                            <td>{new Date(bike.deliveryOrder.date).toLocaleDateString()}</td>
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
