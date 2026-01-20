'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Bike {
    id: string;
    _id: string;
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
    const [doFilter, setDoFilter] = useState<string>('ALL');
    const [modelFilter, setModelFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

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

    // Get unique DO numbers and models for filters
    const uniqueDOs = Array.from(new Set(bikes.map(bike => bike.deliveryOrder?.doNumber).filter(Boolean)));
    const uniqueModels = Array.from(new Set(bikes.map(bike => bike.model)));

    const filteredBikes = bikes.filter(bike => {
        // Status filter
        if (filter !== 'ALL' && bike.status !== filter) return false;

        // DO number filter
        if (doFilter !== 'ALL' && bike.deliveryOrder?.doNumber !== doFilter) return false;

        // Model filter
        if (modelFilter !== 'ALL' && bike.model !== modelFilter) return false;

        // Search query (engine number, chassis number, or model)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesEngine = bike.engineNumber?.toLowerCase().includes(query);
            const matchesChassis = bike.chassisNumber?.toLowerCase().includes(query);
            const matchesModel = bike.model?.toLowerCase().includes(query);
            if (!matchesEngine && !matchesChassis && !matchesModel) return false;
        }

        return true;
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
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>Filters</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                            <div>
                                <label className="label">Search</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Engine #, Chassis #, Model..."
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
                                <label className="label">Model</label>
                                <select
                                    className="select"
                                    value={modelFilter}
                                    onChange={(e) => setModelFilter(e.target.value)}
                                >
                                    <option value="ALL">All Models</option>
                                    {uniqueModels.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Status</label>
                                <select
                                    className="select"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value as any)}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="AVAILABLE">Available</option>
                                    <option value="SOLD">Sold</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    setFilter('ALL');
                                    setDoFilter('ALL');
                                    setModelFilter('ALL');
                                    setSearchQuery('');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.875rem' }}
                            >
                                🔄 Clear Filters
                            </button>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                Showing {filteredBikes.length} of {bikes.length} bikes
                            </span>
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
                            <p>No bikes found matching your filters.</p>
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
                                        <tr key={bike._id}>
                                            <td>{bike.deliveryOrder?.doNumber || 'N/A'}</td>
                                            <td><strong>{bike.model}</strong></td>
                                            <td>{bike.color}</td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{bike.engineNumber}</code></td>
                                            <td><code style={{ fontSize: '0.75rem' }}>{bike.chassisNumber}</code></td>
                                            <td>
                                                <span className={`badge ${bike.status === 'AVAILABLE' ? 'badge-success' : 'badge-error'}`}>
                                                    {bike.status}
                                                </span>
                                            </td>
                                            <td>{bike.deliveryOrder?.date ? new Date(bike.deliveryOrder.date).toLocaleDateString() : 'N/A'}</td>
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
