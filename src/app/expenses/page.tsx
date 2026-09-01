'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';

interface Expense {
    _id: string;
    amount: number;
    description: string;
    category: string;
    deductFrom: 'MARGIN' | 'CASH' | 'WORKSHOP';
    date: string;
}

const CATEGORIES = [
    { value: 'Petrol',          icon: '⛽', color: '#f97316' },
    { value: 'Utility Bills',   icon: '💡', color: '#eab308' },
    { value: 'Parts / Market',  icon: '🔧', color: '#3b82f6' },
    { value: 'Staff Salary',    icon: '👷', color: '#8b5cf6' },
    { value: 'Rent',            icon: '🏠', color: '#06b6d4' },
    { value: 'Food / Tea',      icon: '☕', color: '#a16207' },
    { value: 'Repair',          icon: '🛠️', color: '#64748b' },
    { value: 'Home Expense',    icon: '🏡', color: '#ec4899' },
    { value: 'Other',           icon: '📌', color: '#6b7280' },
];

const getCat = (val: string) => CATEGORIES.find(c => c.value === val) ?? CATEGORIES[CATEGORIES.length - 1];

const emptyForm = {
    amount: '',
    description: '',
    category: 'Petrol',
    deductFrom: 'CASH' as 'MARGIN' | 'CASH' | 'WORKSHOP',
    date: '',
};

export default function ExpensesPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [filterDeduct, setFilterDeduct] = useState<'ALL' | 'MARGIN' | 'CASH' | 'WORKSHOP'>('ALL');
    const [filterCat, setFilterCat] = useState('ALL');

    // Month navigation — default to current month
    const now = new Date();
    const [activeMonth, setActiveMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });

    const getMonthRange = (year: number, month: number) => {
        const lastDay = new Date(year, month + 1, 0).getDate(); // last day of month
        const pad = (n: number) => String(n).padStart(2, '0');
        return {
            startDate: `${year}-${pad(month + 1)}-01`,
            endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
        };
    };

    const fetchExpenses = async (year = activeMonth.year, month = activeMonth.month) => {
        setLoading(true);
        try {
            const { startDate, endDate } = getMonthRange(year, month);
            // Add 1 day to endDate to make the API filter exclusive (<) inclusive of the last day.
            // We do this arithmetically to avoid UTC-shift issues with new Date("YYYY-MM-DD").
            const [ey, em, ed] = endDate.split('-').map(Number);
            const nextDay = new Date(ey, em - 1, ed + 1);
            const pad = (n: number) => String(n).padStart(2, '0');
            const exclusiveEnd = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;
            const params = new URLSearchParams({ startDate, endDate: exclusiveEnd });
            const res = await fetch(`/api/expenses?${params}`);
            if (res.ok) setExpenses(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const goMonth = (dir: -1 | 1) => {
        const d = new Date(activeMonth.year, activeMonth.month + dir, 1);
        const next = { year: d.getFullYear(), month: d.getMonth() };
        setActiveMonth(next);
        fetchExpenses(next.year, next.month);
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
                fetchExpenses();
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
            fetchExpenses();
        } else {
            showToast('Delete failed', 'error');
            setConfirmDeleteId(null);
        }
    };

    // Category totals (all expenses in current date range)
    const categoryTotals = CATEGORIES.map(cat => ({
        ...cat,
        total: expenses.filter(e => (e.category || 'Other') === cat.value).reduce((s, e) => s + e.amount, 0),
    })).filter(c => c.total > 0);

    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    const totalCash = expenses.filter(e => e.deductFrom === 'CASH').reduce((s, e) => s + e.amount, 0);
    const totalMargin = expenses.filter(e => e.deductFrom === 'MARGIN').reduce((s, e) => s + e.amount, 0);
    const totalWorkshop = expenses.filter(e => e.deductFrom === 'WORKSHOP').reduce((s, e) => s + e.amount, 0);

    const filtered = expenses.filter(e => {
        if (filterDeduct !== 'ALL' && e.deductFrom !== filterDeduct) return false;
        if (filterCat !== 'ALL' && (e.category || 'Other') !== filterCat) return false;
        return true;
    });

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Expenses</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Track expenses by category</p>
                </div>

                {/* Summary totals */}
                <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Total', value: totalAll, color: '#ef4444' },
                        { label: 'From Cash', value: totalCash, color: '#f97316' },
                        { label: 'From Margin', value: totalMargin, color: '#f59e0b' },
                        { label: 'From Workshop', value: totalWorkshop, color: '#8b5cf6' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="card" style={{ padding: '1.1rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>Rs. {value.toLocaleString()}</div>
                        </div>
                    ))}
                </div>

                {/* Category breakdown */}
                {categoryTotals.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                            Category Breakdown
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                            {categoryTotals.map(cat => (
                                <div key={cat.value}
                                    onClick={() => setFilterCat(filterCat === cat.value ? 'ALL' : cat.value)}
                                    style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: `1.5px solid ${filterCat === cat.value ? cat.color : 'var(--color-border)'}`, background: filterCat === cat.value ? `${cat.color}15` : 'var(--color-bg-elevated)', cursor: 'pointer', transition: 'all 0.15s' }}>
                                    <div style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{cat.icon}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>{cat.value}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: cat.color }}>Rs. {cat.total.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Month Navigator */}
                <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }} onClick={() => goMonth(-1)}>‹ Prev</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                            {new Date(activeMonth.year, activeMonth.month, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{filtered.length} expense{filtered.length !== 1 ? 's' : ''} · Rs. {filtered.reduce((s, e) => s + e.amount, 0).toLocaleString()}</div>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
                        disabled={activeMonth.year === now.getFullYear() && activeMonth.month === now.getMonth()}
                        onClick={() => goMonth(1)}>Next ›</button>
                </div>

                {/* Add Form */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Add Expense</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Category picker */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>Category *</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {CATEGORIES.map(cat => (
                                    <button key={cat.value} type="button"
                                        onClick={() => setForm({ ...form, category: cat.value })}
                                        style={{
                                            padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                            border: `1.5px solid ${form.category === cat.value ? cat.color : 'var(--color-border)'}`,
                                            background: form.category === cat.value ? `${cat.color}20` : 'var(--color-bg-elevated)',
                                            color: form.category === cat.value ? cat.color : 'var(--color-text-muted)',
                                        }}>
                                        {cat.icon} {cat.value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid-2" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="label">Description *</label>
                                <input className="input" value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="e.g. Petrol for delivery, LESCO bill..." required />
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
                                    onChange={e => setForm({ ...form, deductFrom: e.target.value as 'MARGIN' | 'CASH' | 'WORKSHOP' })}>
                                    <option value="CASH">Cash Received</option>
                                    <option value="MARGIN">Margin / Profit</option>
                                    <option value="WORKSHOP">Workshop</option>
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

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>Deduct:</span>
                    {(['ALL', 'CASH', 'MARGIN', 'WORKSHOP'] as const).map(f => (
                        <button key={f} onClick={() => setFilterDeduct(f)}
                            className={`btn ${filterDeduct === f ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem' }}>
                            {f}
                        </button>
                    ))}
                    {filterCat !== 'ALL' && (
                        <button onClick={() => setFilterCat('ALL')} className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem', marginLeft: '0.5rem', color: getCat(filterCat).color }}>
                            {getCat(filterCat).icon} {filterCat} ✕
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="card">
                    {loading ? (
                        <Loader size={140} />
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No expenses found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filtered.map(exp => {
                                const cat = getCat(exp.category || 'Other');
                                const isConfirming = confirmDeleteId === exp._id;
                                return (
                                    <div key={exp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: `1px solid ${isConfirming ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', background: isConfirming ? 'rgba(239,68,68,0.04)' : 'var(--color-bg-elevated)', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 200px' }}>
                                            <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{cat.icon}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exp.description}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 600, color: cat.color }}>{cat.value}</span>
                                                    <span>📅 {new Date(exp.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <span style={{ fontWeight: 700, padding: '0px 5px', borderRadius: '4px', fontSize: '0.68rem',
                                                        background: exp.deductFrom === 'CASH' ? 'rgba(239,68,68,0.1)' : exp.deductFrom === 'WORKSHOP' ? 'rgba(139,92,246,0.1)' : 'rgba(245,158,11,0.1)',
                                                        color: exp.deductFrom === 'CASH' ? '#ef4444' : exp.deductFrom === 'WORKSHOP' ? '#8b5cf6' : '#f59e0b' }}>
                                                        -{exp.deductFrom}
                                                    </span>
                                                </div>
                                                {isConfirming && <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginTop: '0.3rem' }}>Delete this expense?</div>}
                                            </div>
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
