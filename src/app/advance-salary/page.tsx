'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';

interface AdvanceSalaryRecord {
    _id: string;
    staffName: string;
    amount: number;
    deductFrom: 'CASH' | 'MARGIN';
    note?: string;
    date: string;
    recovered: boolean;
    recoveredAt?: string;
    recoveredNote?: string;
}

const emptyForm = {
    staffName: '',
    amount: '',
    deductFrom: 'CASH' as 'CASH' | 'MARGIN',
    note: '',
    date: '',
};

export default function AdvanceSalaryPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [records, setRecords] = useState<AdvanceSalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filterStaff, setFilterStaff] = useState('ALL');
    const [filterRecovered, setFilterRecovered] = useState<'ALL' | 'PENDING' | 'RECOVERED'>('ALL');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [recoveringId, setRecoveringId] = useState<string | null>(null);
    const [recoveredNote, setRecoveredNote] = useState('');

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/advance-salary');
            if (res.ok) setRecords(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/advance-salary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, amount: Number(form.amount) }),
            });
            if (res.ok) {
                showToast('Advance salary recorded!', 'success');
                setForm(emptyForm);
                setShowForm(false);
                fetchRecords();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/advance-salary/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Record deleted', 'success');
            setConfirmDeleteId(null);
            fetchRecords();
        } else {
            showToast('Delete failed', 'error');
            setConfirmDeleteId(null);
        }
    };

    const handleMarkRecovered = async (id: string) => {
        const res = await fetch(`/api/advance-salary/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recovered: true, recoveredNote }),
        });
        if (res.ok) {
            showToast('Marked as recovered ✅', 'success');
            setRecoveringId(null);
            setRecoveredNote('');
            fetchRecords();
        } else {
            showToast('Failed to update', 'error');
        }
    };

    const handleUnrecover = async (id: string) => {
        const res = await fetch(`/api/advance-salary/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recovered: false }),
        });
        if (res.ok) {
            showToast('Marked as pending', 'success');
            fetchRecords();
        }
    };

    // Unique staff names for filter
    const staffNames = Array.from(new Set(records.map(r => r.staffName))).sort();

    const filtered = records.filter(r => {
        if (filterStaff !== 'ALL' && r.staffName !== filterStaff) return false;
        if (filterRecovered === 'PENDING' && r.recovered) return false;
        if (filterRecovered === 'RECOVERED' && !r.recovered) return false;
        return true;
    });

    // Summary stats
    const totalGiven = records.reduce((s, r) => s + r.amount, 0);
    const totalPending = records.filter(r => !r.recovered).reduce((s, r) => s + r.amount, 0);
    const totalRecovered = records.filter(r => r.recovered).reduce((s, r) => s + r.amount, 0);

    // Per-staff summary
    const staffSummary = staffNames.map(name => ({
        name,
        total: records.filter(r => r.staffName === name).reduce((s, r) => s + r.amount, 0),
        pending: records.filter(r => r.staffName === name && !r.recovered).reduce((s, r) => s + r.amount, 0),
    }));

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>💰 Advance Salary</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            Track advance payments given to staff · {records.filter(r => !r.recovered).length} pending
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : '➕ Give Advance'}
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total Given', value: totalGiven, color: '#ef4444', icon: '💸' },
                        { label: 'Pending Recovery', value: totalPending, color: '#f59e0b', icon: '⏳' },
                        { label: 'Recovered', value: totalRecovered, color: '#10b981', icon: '✅' },
                    ].map(({ label, value, color, icon }) => (
                        <div key={label} className="card" style={{ padding: '1.1rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>{icon}</span> {label}
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>Rs. {value.toLocaleString()}</div>
                        </div>
                    ))}
                </div>

                {/* Per-staff breakdown */}
                {staffSummary.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                            Staff Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            {staffSummary.map(s => (
                                <div
                                    key={s.name}
                                    onClick={() => setFilterStaff(filterStaff === s.name ? 'ALL' : s.name)}
                                    style={{
                                        padding: '0.85rem 1rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                                        border: `1.5px solid ${filterStaff === s.name ? '#8b5cf6' : 'var(--color-border)'}`,
                                        background: filterStaff === s.name ? 'rgba(139,92,246,0.08)' : 'var(--color-bg-elevated)',
                                    }}
                                >
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>👤 {s.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#ef4444' }}>Total: Rs. {s.total.toLocaleString()}</div>
                                    {s.pending > 0 && (
                                        <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.1rem' }}>Pending: Rs. {s.pending.toLocaleString()}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Form */}
                {showForm && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Give Advance Salary</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Staff Name *</label>
                                    <input
                                        className="input"
                                        value={form.staffName}
                                        onChange={e => setForm({ ...form, staffName: e.target.value })}
                                        required
                                        placeholder="e.g. Ahmed, Raza..."
                                        list="staff-names-list"
                                    />
                                    {/* Quick autocomplete from existing names */}
                                    <datalist id="staff-names-list">
                                        {staffNames.map(n => <option key={n} value={n} />)}
                                    </datalist>
                                </div>
                                <div className="form-group">
                                    <label className="label">Amount (PKR) *</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="input"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        required
                                        placeholder="5000"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Deduct From *</label>
                                    <select
                                        className="select"
                                        value={form.deductFrom}
                                        onChange={e => setForm({ ...form, deductFrom: e.target.value as 'CASH' | 'MARGIN' })}
                                    >
                                        <option value="CASH">Cash Received</option>
                                        <option value="MARGIN">Margin / Profit</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Date</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="label">Note (optional)</label>
                                    <input
                                        className="input"
                                        value={form.note}
                                        onChange={e => setForm({ ...form, note: e.target.value })}
                                        placeholder="Reason or note..."
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving...' : '✅ Save'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status:</span>
                    {(['ALL', 'PENDING', 'RECOVERED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterRecovered(f)}
                            className={`btn ${filterRecovered === f ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}
                        >
                            {f === 'ALL' ? 'All' : f === 'PENDING' ? '⏳ Pending' : '✅ Recovered'}
                        </button>
                    ))}
                    {filterStaff !== 'ALL' && (
                        <button
                            onClick={() => setFilterStaff('ALL')}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem', marginLeft: '0.5rem', color: '#8b5cf6' }}
                        >
                            👤 {filterStaff} ✕
                        </button>
                    )}
                </div>

                {/* Records List */}
                <div className="card">
                    {loading ? (
                        <Loader size={140} />
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💰</div>
                            <div>No advance salary records found.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filtered.map(r => {
                                const isDelConfirm = confirmDeleteId === r._id;
                                const isRecovering = recoveringId === r._id;
                                return (
                                    <div
                                        key={r._id}
                                        style={{
                                            padding: '0.9rem 1rem',
                                            border: `1px solid ${isDelConfirm ? 'rgba(239,68,68,0.4)' : r.recovered ? 'rgba(16,185,129,0.25)' : 'var(--color-border)'}`,
                                            borderRadius: 'var(--radius-lg)',
                                            background: isDelConfirm ? 'rgba(239,68,68,0.04)' : r.recovered ? 'rgba(16,185,129,0.03)' : 'var(--color-bg-elevated)',
                                            display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start', justifyContent: 'space-between',
                                        }}
                                    >
                                        <div style={{ flex: '1 1 220px' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '0.95rem' }}>👤 {r.staffName}</strong>
                                                <span style={{
                                                    fontSize: '0.7rem', padding: '1px 7px', borderRadius: '4px', fontWeight: 700,
                                                    background: r.recovered ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                    color: r.recovered ? '#10b981' : '#f59e0b',
                                                }}>
                                                    {r.recovered ? '✅ RECOVERED' : '⏳ PENDING'}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700,
                                                    background: r.deductFrom === 'CASH' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: r.deductFrom === 'CASH' ? '#ef4444' : '#f59e0b',
                                                }}>
                                                    -{r.deductFrom}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                                <span>📅 {new Date(r.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                {r.note && <span>📝 {r.note}</span>}
                                                {r.recovered && r.recoveredAt && (
                                                    <span style={{ color: '#10b981' }}>✅ Recovered on {new Date(r.recoveredAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                )}
                                                {r.recoveredNote && <span>📌 {r.recoveredNote}</span>}
                                            </div>
                                            {isDelConfirm && (
                                                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>Delete this advance record?</div>
                                            )}
                                            {isRecovering && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <input
                                                        className="input"
                                                        style={{ flex: '1 1 180px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                        placeholder="Recovery note (optional)"
                                                        value={recoveredNote}
                                                        onChange={e => setRecoveredNote(e.target.value)}
                                                    />
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', background: '#10b981', color: '#fff', border: 'none' }}
                                                        onClick={() => handleMarkRecovered(r._id)}
                                                    >
                                                        ✅ Confirm
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                                                        onClick={() => { setRecoveringId(null); setRecoveredNote(''); }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>
                                                Rs. {r.amount.toLocaleString()}
                                            </span>
                                            {isDelConfirm ? (
                                                <>
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }}
                                                        onClick={() => handleDelete(r._id)}
                                                    >
                                                        Yes, Delete
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                                        onClick={() => setConfirmDeleteId(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {!r.recovered && !isRecovering && (
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                                                            onClick={() => setRecoveringId(r._id)}
                                                        >
                                                            ✅ Mark Recovered
                                                        </button>
                                                    )}
                                                    {r.recovered && (
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                                            onClick={() => handleUnrecover(r._id)}
                                                        >
                                                            ↩️ Undo
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                                        onClick={() => setConfirmDeleteId(r._id)}
                                                    >
                                                        🗑️
                                                    </button>
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
