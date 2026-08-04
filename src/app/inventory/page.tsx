'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';

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

interface DeliveryOrderRow {
    _id: string;
    doNumber: string;
    date: string;
    dealerName: string;
    bikes: { status: string }[];
}

export default function InventoryPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [bikes, setBikes] = useState<Bike[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLD'>('ALL');
    const [doFilter, setDoFilter] = useState<string>('ALL');
    const [modelFilter, setModelFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingBike, setEditingBike] = useState<Bike | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrderRow[]>([]);
    const [showDOs, setShowDOs] = useState(false);
    const [deletingDoId, setDeletingDoId] = useState<string | null>(null);

    useEffect(() => {
        fetchBikes();
        fetchDeliveryOrders();
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

    const fetchDeliveryOrders = async () => {
        try {
            const response = await fetch('/api/delivery-orders');
            if (response.ok) setDeliveryOrders(await response.json());
        } catch (error) {
            console.error('Failed to fetch delivery orders:', error);
        }
    };

    const handleDeleteDO = async (doId: string, doNumber: string, bikeCount: number) => {
        if (!confirm(`Delete delivery order "${doNumber}" and all ${bikeCount} bike(s) under it? This can't be undone.`)) return;
        setDeletingDoId(doId);
        try {
            const response = await fetch(`/api/delivery-orders/${doId}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Delivery order deleted', 'success');
                fetchDeliveryOrders();
                fetchBikes();
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to delete', 'error');
            }
        } catch (error) {
            console.error('Delete DO error:', error);
            showToast('An error occurred while deleting', 'error');
        } finally {
            setDeletingDoId(null);
        }
    };

    const handleDeleteBike = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bike from inventory?')) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/bikes/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('Bike deleted successfully', 'success');
                fetchBikes();
            } else {
                const error = await response.json();
                showToast(`Failed to delete: ${error.message}`, 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('An error occurred while deleting', 'error');
        } finally {
            setIsDeleting(false);
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

                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setShowDOs(s => !s)}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>📋 Delivery Orders ({deliveryOrders.length})</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{showDOs ? '▲ Hide' : '▼ Show'}</span>
                    </div>
                    {showDOs && (
                        <div style={{ marginTop: 'var(--spacing-lg)', overflowX: 'auto' }}>
                            {deliveryOrders.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No delivery orders yet.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                            {['DO Number', 'Date', 'Dealer', 'Total', 'Available', 'Sold', ''].map(h => (
                                                <th key={h} style={{ padding: '6px 8px', textAlign: h === 'DO Number' || h === 'Dealer' ? 'left' : 'right', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deliveryOrders.map(order => {
                                            const total = order.bikes?.length ?? 0;
                                            const sold = order.bikes?.filter(b => b.status === 'SOLD').length ?? 0;
                                            const available = total - sold;
                                            return (
                                                <tr key={order._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{order.doNumber}</td>
                                                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{new Date(order.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '6px 8px' }}>{order.dealerName}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{total}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--color-success)' }}>{available}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: sold > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{sold}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => handleDeleteDO(order._id, order.doNumber, total)}
                                                            disabled={sold > 0 || deletingDoId === order._id}
                                                            title={sold > 0 ? 'Cannot delete — some bikes from this DO are already sold' : 'Delete this delivery order and its bikes'}
                                                            className="btn"
                                                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', background: sold > 0 ? 'var(--color-bg-elevated)' : 'rgba(239,68,68,0.1)', color: sold > 0 ? 'var(--color-text-muted)' : '#ef4444', border: sold > 0 ? '1px solid var(--color-border)' : '1px solid rgba(239,68,68,0.3)', cursor: sold > 0 ? 'not-allowed' : 'pointer' }}>
                                                            {deletingDoId === order._id ? 'Deleting...' : '🗑️ Delete'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
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
                        <Loader size={160} />
                    ) : filteredBikes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</p>
                            <p>No bikes found matching your filters.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredBikes.map((bike) => (
                                <div key={bike._id} style={{ padding: '0.875rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: '1 1 200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                            <strong style={{ fontSize: '0.95rem' }}>{bike.model}</strong>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{bike.color}</span>
                                            <span className={`badge ${bike.status === 'AVAILABLE' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                                {bike.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <span>Engine: <code style={{ fontSize: '0.72rem' }}>{bike.engineNumber}</code></span>
                                            <span>Chassis: <code style={{ fontSize: '0.72rem' }}>{bike.chassisNumber}</code></span>
                                            <span>DO: {bike.deliveryOrder?.doNumber || 'N/A'}</span>
                                            <span>{bike.deliveryOrder?.date ? new Date(bike.deliveryOrder.date).toLocaleDateString() : ''}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                            onClick={() => setEditingBike(bike)}>✏️ Edit</button>
                                        {bike.status === 'AVAILABLE' && (
                                            <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                                onClick={() => handleDeleteBike(bike._id)} disabled={isDeleting}>🗑️</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Edit Bike Modal */}
                {editingBike && (
                    <EditBikeModal
                        bike={editingBike}
                        onClose={() => setEditingBike(null)}
                        onSuccess={() => {
                            setEditingBike(null);
                            fetchBikes();
                        }}
                        showToast={showToast}
                    />
                )}
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}

function EditBikeModal({ bike, onClose, onSuccess, showToast }: { bike: Bike; onClose: () => void; onSuccess: () => void; showToast: (message: string, type: 'success' | 'error') => void }) {
    const [formData, setFormData] = useState({
        model: bike.model,
        color: bike.color,
        engineNumber: bike.engineNumber,
        chassisNumber: bike.chassisNumber
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await fetch(`/api/bikes/${bike._id}`, {
                method: 'PATCH',
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('Bike updated successfully', 'success');
                onSuccess();
            } else {
                const error = await response.json();
                showToast(`Failed to update: ${error.message}`, 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            showToast('An error occurred during update', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Bike Details</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label">Model</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Color</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Engine Number</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.engineNumber}
                                onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Chassis Number</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.chassisNumber}
                                onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
