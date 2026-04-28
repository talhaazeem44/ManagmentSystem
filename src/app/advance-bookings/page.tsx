'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HONDA_BIKE_MODELS } from '@/lib/constants';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface AdvanceBooking {
    _id: string;
    customerName: string;
    customerMobile?: string;
    cnic?: string;
    bikeModel?: string;
    bikeColor?: string;
    advancePaid: number;
    totalPrice?: number;
    registrationFee?: number;
    margin?: number;
    notes?: string;
    expectedDeliveryDate?: string;
    status: 'PENDING' | 'DELIVERED';
    date: string;
}

const emptyForm = {
    customerName: '',
    customerMobile: '',
    cnic: '',
    bikeModel: '',
    bikeColor: '',
    advancePaid: '',
    totalPrice: '',
    registrationFee: '',
    notes: '',
    expectedDeliveryDate: '',
};

function printBooking(b: AdvanceBooking) {
    window.open(`/advance-bookings/${b._id}/receipt`, '_blank');
}

export default function AdvanceBookingsPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [bookings, setBookings] = useState<AdvanceBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('PENDING');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/advance-bookings');
            if (res.ok) setBookings(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBookings(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/advance-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    advancePaid: Number(form.advancePaid),
                    totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
                    registrationFee: form.registrationFee ? Number(form.registrationFee) : 0,
                    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
                }),
            });
            if (res.ok) {
                showToast('Booking added!', 'success');
                setForm(emptyForm);
                setShowForm(false);
                fetchBookings();
            } else {
                const err = await res.json();
                showToast(err.message, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const markDelivered = async (id: string) => {
        const res = await fetch(`/api/advance-bookings/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DELIVERED' }),
        });
        if (res.ok) { showToast('Marked as delivered', 'success'); fetchBookings(); }
        else showToast('Failed to update', 'error');
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/advance-bookings/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Booking deleted', 'success');
            setConfirmDeleteId(null);
            fetchBookings();
        } else {
            const err = await res.json().catch(() => ({ message: 'Delete failed' }));
            showToast(err.message || 'Delete failed', 'error');
            setConfirmDeleteId(null);
        }
    };

    const filtered = bookings.filter(b => filter === 'ALL' || b.status === filter);
    const pendingBookings = bookings.filter(b => b.status === 'PENDING');
    const totalAdvance = pendingBookings.reduce((s, b) => s + b.advancePaid, 0);
    const totalMargin = pendingBookings.reduce((s, b) => s + (b.margin || 0), 0);
    const pendingCount = pendingBookings.length;

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Advance Bookings</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            {pendingCount} pending · Advance: Rs. {totalAdvance.toLocaleString()} · Expected Profit: <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Rs. {totalMargin.toLocaleString()}</span>
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : '➕ New Booking'}
                    </button>
                </div>

                {showForm && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Add Advance Booking</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Customer Name *</label>
                                    <input className="input" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} required placeholder="Muhammad Ali" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Mobile</label>
                                    <input className="input" value={form.customerMobile} onChange={e => setForm({ ...form, customerMobile: e.target.value })} placeholder="0300-1234567" />
                                </div>
                                <div className="form-group">
                                    <label className="label">CNIC</label>
                                    <input className="input" value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} placeholder="34601-XXXXXXX-X" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Bike Model</label>
                                    <select className="select" value={form.bikeModel} onChange={e => setForm({ ...form, bikeModel: e.target.value })}>
                                        <option value="">Select model</option>
                                        {HONDA_BIKE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Bike Color</label>
                                    <input className="input" value={form.bikeColor} onChange={e => setForm({ ...form, bikeColor: e.target.value })} placeholder="Red / Black..." />
                                </div>
                                <div className="form-group">
                                    <label className="label">Total Sale Price (PKR)</label>
                                    <input type="text" inputMode="decimal" className="input" value={form.totalPrice} onChange={e => setForm({ ...form, totalPrice: e.target.value })} placeholder="238500" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Advance Paid (PKR) *</label>
                                    <input type="text" inputMode="decimal" className="input" value={form.advancePaid} onChange={e => setForm({ ...form, advancePaid: e.target.value })} required placeholder="5000" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Registration Fees (PKR)</label>
                                    <input type="text" inputMode="decimal" className="input" value={form.registrationFee} onChange={e => setForm({ ...form, registrationFee: e.target.value })} placeholder="9000" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Expected Delivery Date</label>
                                    <input type="date" className="input" value={form.expectedDeliveryDate} onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Notes</label>
                                    <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special note..." />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-success" disabled={submitting}>
                                    {submitting ? 'Saving...' : '✅ Save Booking'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {(['PENDING', 'DELIVERED', 'ALL'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}>
                            {f === 'ALL' ? 'All' : f === 'PENDING' ? `Pending (${pendingCount})` : 'Delivered'}
                        </button>
                    ))}
                </div>

                <div className="card">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No bookings found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {filtered.map(b => {
                                const remaining = b.totalPrice ? b.totalPrice - b.advancePaid : null;
                                const isConfirming = confirmDeleteId === b._id;
                                const isOverdue = b.status === 'PENDING' && b.expectedDeliveryDate && new Date(b.expectedDeliveryDate) < new Date();
                                return (
                                    <div key={b._id} style={{ padding: '0.9rem 1rem', border: `1px solid ${isConfirming ? 'rgba(239,68,68,0.4)' : isOverdue ? 'rgba(239,68,68,0.35)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', background: isConfirming ? 'rgba(239,68,68,0.04)' : isOverdue ? 'rgba(239,68,68,0.04)' : 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ flex: '1 1 200px' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '0.9rem' }}>{b.customerName}</strong>
                                                {b.status === 'PENDING' && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>PENDING</span>}
                                                {b.status === 'DELIVERED' && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>DELIVERED</span>}
                                                {isOverdue && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>⚠️ OVERDUE</span>}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {b.customerMobile && <span>📞 {b.customerMobile}</span>}
                                                {b.bikeModel && <span>🏍️ {b.bikeModel}{b.bikeColor ? ` · ${b.bikeColor}` : ''}</span>}
                                                <span>📅 {new Date(b.date).toLocaleDateString()}</span>
                                                {b.expectedDeliveryDate && <span style={{ color: isOverdue ? '#ef4444' : 'var(--color-text-muted)', fontWeight: isOverdue ? 700 : 400 }}>🚚 By {new Date(b.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>}
                                            </div>
                                            <div style={{ marginTop: '0.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                                <span>Advance: <strong style={{ color: 'var(--color-success)' }}>Rs. {b.advancePaid.toLocaleString()}</strong></span>
                                                {b.totalPrice && <span>Total: <strong>Rs. {b.totalPrice.toLocaleString()}</strong></span>}
                                                {remaining !== null && <span>Remaining: <strong style={{ color: '#ef4444' }}>Rs. {remaining.toLocaleString()}</strong></span>}
                                                {b.registrationFee ? <span>Reg: <strong>Rs. {b.registrationFee.toLocaleString()}</strong></span> : null}
                                            </div>
                                            {b.notes && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>Note: {b.notes}</div>}
                                            {isConfirming && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
                                                    Delete this booking?
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                            {isConfirming ? (
                                                <>
                                                    <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleDelete(b._id)}>Yes, Delete</button>
                                                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    {b.status === 'PENDING' && (
                                                        <button className="btn btn-success" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => markDelivered(b._id)}>✅ Delivered</button>
                                                    )}
                                                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} onClick={() => printBooking(b)}>🖨️</button>
                                                    <button className="btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => setConfirmDeleteId(b._id)}>🗑️</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
