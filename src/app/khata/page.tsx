'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';

interface KhataParty {
    _id: string;
    name: string;
    mobile?: string;
    address?: string;
    notes?: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
    transactionCount: number;
    lastActivity?: string;
}

const emptyForm = { name: '', mobile: '', address: '', notes: '' };

export default function KhataListPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [parties, setParties] = useState<KhataParty[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchParties = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/khata');
            if (res.ok) setParties(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchParties(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/khata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                showToast('Party added!', 'success');
                setForm(emptyForm);
                setShowForm(false);
                fetchParties();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/khata/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Party deleted', 'success');
            setConfirmDeleteId(null);
            fetchParties();
        } else {
            showToast('Delete failed', 'error');
            setConfirmDeleteId(null);
        }
    };

    const totalOutstanding = parties.reduce((s, p) => s + Math.max(0, p.balance), 0);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Khata / Ledger</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            {parties.length} part{parties.length !== 1 ? 'ies' : 'y'} · Outstanding: Rs. {totalOutstanding.toLocaleString()}
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : '➕ Add Party'}
                    </button>
                </div>

                {showForm && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>New Party</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Name *</label>
                                    <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Party name" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Mobile</label>
                                    <input className="input" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="0300-1234567" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Address</label>
                                    <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City / Area" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Notes</label>
                                    <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any note..." />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-success" disabled={submitting}>{submitting ? 'Saving...' : '✅ Save'}</button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="card">
                    {loading ? <Loader size={140} /> : parties.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📒</div>
                            <div>No parties yet. Add your first party above.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {parties.map(p => {
                                const isConfirming = confirmDeleteId === p._id;
                                const settled = p.balance <= 0;
                                return (
                                    <div key={p._id} style={{ padding: '0.9rem 1rem', border: `1px solid ${isConfirming ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', background: isConfirming ? 'rgba(239,68,68,0.04)' : 'var(--color-bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ flex: '1 1 200px' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '0.95rem' }}>{p.name}</strong>
                                                <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '4px', fontWeight: 700, background: settled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: settled ? '#22c55e' : '#ef4444' }}>
                                                    {settled ? 'SETTLED' : `Rs. ${p.balance.toLocaleString()} DUE`}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                                {p.mobile && <span>📞 {p.mobile}</span>}
                                                {p.address && <span>📍 {p.address}</span>}
                                                <span>📝 {p.transactionCount} entries</span>
                                            </div>
                                            <div style={{ marginTop: '0.3rem', fontSize: '0.82rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <span>Given: <strong style={{ color: '#ef4444' }}>Rs. {p.totalDebit.toLocaleString()}</strong></span>
                                                <span>Paid: <strong style={{ color: '#10b981' }}>Rs. {p.totalCredit.toLocaleString()}</strong></span>
                                            </div>
                                            {isConfirming && <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>Delete this party and all its records?</div>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                            {isConfirming ? (
                                                <>
                                                    <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleDelete(p._id)}>Yes, Delete</button>
                                                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <a href={`/khata/${p._id}`} className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>Open Khata →</a>
                                                    <button className="btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => setConfirmDeleteId(p._id)}>🗑️</button>
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
