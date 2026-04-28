'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface Expense {
    _id: string;
    amount: number;
    description: string;
    deductFrom: 'MARGIN' | 'CASH';
    date: string;
}

const emptyForm = { amount: '', description: '', deductFrom: 'CASH' as 'MARGIN' | 'CASH', date: '' };

export default function ExpensesPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'MARGIN' | 'CASH'>('ALL');
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

    const fetchExpenses = async (range = dateRange) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (range.startDate) params.set('startDate', range.startDate);
            if (range.endDate) {
                const end = new Date(range.endDate);
                end.setDate(end.getDate() + 1);
                params.set('endDate', end.toISOString().split('T')[0]);
            }
            const res = await fetch(`/api/expenses?${params}`);
            if (res.ok) setExpenses(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExpenses(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, amount: Number(form.amount) }),
            });
            if (res.ok) {
                showToast('Expense added', 'success');
                setForm(emptyForm);
                fetchExpenses(dateRange);
            } else {
                const err = await res.json();
                showToast(err.message, 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Expense deleted', 'success');
            setConfirmDeleteId(null);
            fetchExpenses(dateRange);
        } else {
            showToast('Delete failed', 'error');
            setConfirmDeleteId(null);
        }
    };

    const filtered = expenses.filter(e => filter === 'ALL' || e.deductFrom === filter);
    const totalCash = expenses.filter(e => e.deductFrom === 'CASH').reduce((s, e) => s + e.amount, 0);
    const totalMargin = expenses.filter(e => e.deductFrom === 'MARGIN').reduce((s, e) => s + e.amount, 0);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Expenses</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Track and deduct expenses from cash or margin</p>
                </div>

                {/* Summary */}
                <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                            Deducted from Cash{(dateRange.startDate || dateRange.endDate) ? ' (filtered)' : ''}
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444' }}>Rs. {totalCash.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                            Deducted from Margin{(dateRange.startDate || dateRange.endDate) ? ' (filtered)' : ''}
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b' }}>Rs. {totalMargin.toLocaleString()}</div>
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>📅 Filter by Date Range</div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                            <label className="label">From</label>
                            <input type="date" className="input" value={dateRange.startDate}
                                onChange={e => setDateRange(r => ({ ...r, startDate: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
                            <label className="label">To</label>
                            <input type="date" className="input" value={dateRange.endDate}
                                onChange={e => setDateRange(r => ({ ...r, endDate: e.target.value }))} />
                        </div>
                        <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                            onClick={() => fetchExpenses(dateRange)}>
                            Search
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                            onClick={() => { const r = { startDate: '', endDate: '' }; setDateRange(r); fetchExpenses(r); }}>
                            Reset
                        </button>
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                            Showing expenses{dateRange.startDate ? ` from ${new Date(dateRange.startDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                            {dateRange.endDate ? ` to ${new Date(dateRange.endDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </div>
                    )}
                </div>

                {/* Add Form */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Add Expense</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid-2" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="label">Description *</label>
                                <input className="input" value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Fuel, Rent, Salary..." required />
                            </div>
                            <div className="form-group">
                                <label className="label">Amount (PKR) *</label>
                                <input type="text" inputMode="decimal" className="input" value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                    placeholder="5000" required />
                            </div>
                            <div className="form-group">
                                <label className="label">Deduct From *</label>
                                <select className="select" value={form.deductFrom}
                                    onChange={e => setForm({ ...form, deductFrom: e.target.value as 'MARGIN' | 'CASH' })}>
                                    <option value="CASH">Cash Received</option>
                                    <option value="MARGIN">Margin / Profit</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Date</label>
                                <input type="date" className="input" value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : '➕ Add Expense'}
                        </button>
                    </form>
                </div>

                {/* Filter */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {(['ALL', 'CASH', 'MARGIN'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}>
                            {f === 'ALL' ? `All (${expenses.length})` : f === 'CASH' ? `Cash (${expenses.filter(e => e.deductFrom === 'CASH').length})` : `Margin (${expenses.filter(e => e.deductFrom === 'MARGIN').length})`}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="card">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No expenses found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filtered.map(exp => {
                                const isConfirming = confirmDeleteId === exp._id;
                                return (
                                    <div key={exp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: `1px solid ${isConfirming ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', background: isConfirming ? 'rgba(239,68,68,0.04)' : 'var(--color-bg-elevated)', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ flex: '1 1 200px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exp.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.75rem' }}>
                                                <span>📅 {new Date(exp.date).toLocaleDateString()}</span>
                                                <span style={{ fontWeight: 700, padding: '0px 6px', borderRadius: '4px', fontSize: '0.7rem',
                                                    background: exp.deductFrom === 'CASH' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: exp.deductFrom === 'CASH' ? '#ef4444' : '#f59e0b' }}>
                                                    -{exp.deductFrom}
                                                </span>
                                            </div>
                                            {isConfirming && <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginTop: '0.3rem' }}>Delete this expense?</div>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>-Rs. {exp.amount.toLocaleString()}</span>
                                            {isConfirming ? (
                                                <>
                                                    <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleDelete(exp._id)}>Yes, Delete</button>
                                                    <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                                                </>
                                            ) : (
                                                <button className="btn" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                                    onClick={() => setConfirmDeleteId(exp._id)}>🗑️</button>
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
