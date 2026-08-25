'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface DepositRecord {
    _id: string;
    amount: number;
    note?: string;
    date: string;
}

interface ExpenseRecord {
    _id: string;
    amount: number;
    description: string;
    date: string;
}

export default function WorkshopTrackerPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [deposits, setDeposits] = useState<DepositRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [depositForm, setDepositForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
    const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [savingDeposit, setSavingDeposit] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    const [trackerMonth, setTrackerMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => { fetchTrackerData(); }, [trackerMonth]);

    const fetchTrackerData = async () => {
        const [year, month] = trackerMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
        try {
            const [depRes, expRes] = await Promise.all([
                fetch(`/api/workshop/deposits?startDate=${start}&endDate=${end}`),
                fetch(`/api/expenses?startDate=${start}&endDate=${end}`),
            ]);
            if (depRes.ok) {
                setDeposits(await depRes.json());
            } else {
                showToast('Could not refresh deposits list — reload the page to check', 'error');
            }
            if (expRes.ok) {
                const all = await expRes.json();
                setExpenses(all.filter((e: any) => e.deductFrom === 'WORKSHOP'));
            } else {
                showToast('Could not refresh expenses list — reload the page to check', 'error');
            }
        } catch {
            showToast('Could not refresh tracker data — check your connection', 'error');
        }
    };

    const handleAddDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!depositForm.amount) return;
        setSavingDeposit(true);
        try {
            const res = await fetch('/api/workshop/deposits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(depositForm.amount), note: depositForm.note, date: depositForm.date }),
            });
            if (res.ok) {
                showToast('Deposit saved', 'success');
                setDepositForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
                await fetchTrackerData();
            } else {
                const err = await res.json().catch(() => ({ message: `Failed to save deposit (HTTP ${res.status})` }));
                showToast(err.message || 'Failed to save deposit', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Error saving deposit — check your connection', 'error');
        }
        finally { setSavingDeposit(false); }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.amount || !expenseForm.description) return;
        setSavingExpense(true);
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(expenseForm.amount), description: expenseForm.description, deductFrom: 'WORKSHOP', date: expenseForm.date }),
            });
            if (res.ok) {
                showToast('Expense saved', 'success');
                setExpenseForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
                await fetchTrackerData();
            } else {
                const err = await res.json().catch(() => ({ message: `Failed to save expense (HTTP ${res.status})` }));
                showToast(err.message || 'Failed to save expense', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Error saving expense — check your connection', 'error');
        }
        finally { setSavingExpense(false); }
    };

    const handleDeleteDeposit = async (id: string) => {
        if (!confirm('Delete this deposit entry?')) return;
        await fetch(`/api/workshop/deposits?id=${id}`, { method: 'DELETE' });
        fetchTrackerData();
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Delete this expense?')) return;
        await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        fetchTrackerData();
    };

    const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netCash = totalDeposits - totalExpenses;
    const monthLabel = new Date(trackerMonth + '-01').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

    const trackerLog: { id: string; type: 'deposit' | 'expense'; amount: number; label: string; date: string }[] = [
        ...deposits.map(d => ({ id: d._id, type: 'deposit' as const, amount: d.amount, label: d.note || 'Daily Sale', date: d.date })),
        ...expenses.map(e => ({ id: e._id, type: 'expense' as const, amount: e.amount, label: e.description, date: e.date })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Workshop Cash Tracker</h1>
                    <input
                        type="month"
                        className="input"
                        style={{ fontSize: '0.9rem', padding: '0.4rem 0.75rem', maxWidth: '180px' }}
                        value={trackerMonth}
                        onChange={e => setTrackerMonth(e.target.value)}
                    />
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>{monthLabel} — Deposits</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>Rs. {totalDeposits.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>Expenses</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>− Rs. {totalExpenses.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: `4px solid ${netCash >= 0 ? '#3b82f6' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.7rem', color: netCash >= 0 ? '#3b82f6' : '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>Net Cash</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: netCash >= 0 ? '#3b82f6' : '#ef4444' }}>Rs. {netCash.toLocaleString()}</div>
                    </div>
                </div>

                <div className="grid-2" style={{ alignItems: 'start' }}>
                    {/* Forms */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="card">
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.75rem', textTransform: 'uppercase' }}>+ Add Daily Sale</div>
                            <form onSubmit={handleAddDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input type="number" className="input" placeholder="Amount (Rs.)" required
                                    value={depositForm.amount}
                                    onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} min="1" />
                                <input type="text" className="input" placeholder="Note (optional)"
                                    value={depositForm.note}
                                    onChange={e => setDepositForm({ ...depositForm, note: e.target.value })} />
                                <input type="date" className="input"
                                    value={depositForm.date}
                                    onChange={e => setDepositForm({ ...depositForm, date: e.target.value })} />
                                <button type="submit" disabled={savingDeposit}
                                    style={{ padding: '0.6rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                    {savingDeposit ? 'Saving...' : 'Save Deposit'}
                                </button>
                            </form>
                        </div>

                        <div className="card">
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', textTransform: 'uppercase' }}>− Add Expense</div>
                            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input type="number" className="input" placeholder="Amount (Rs.)" required
                                    value={expenseForm.amount}
                                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} min="1" />
                                <input type="text" className="input" placeholder="Description (e.g. Oil purchased)" required
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                                <input type="date" className="input"
                                    value={expenseForm.date}
                                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                                <button type="submit" disabled={savingExpense}
                                    style={{ padding: '0.6rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                    {savingExpense ? 'Saving...' : 'Save Expense'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Transaction Log */}
                    <div className="card">
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                            {monthLabel} — Transactions
                        </div>
                        {trackerLog.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No entries this month</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '500px', overflowY: 'auto' }}>
                                {trackerLog.map(entry => (
                                    <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', background: entry.type === 'deposit' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${entry.type === 'deposit' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{entry.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(entry.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                                {' · '}{entry.type === 'deposit' ? 'Sale' : 'Expense'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: entry.type === 'deposit' ? '#10b981' : '#ef4444' }}>
                                                {entry.type === 'deposit' ? '+' : '−'} Rs. {entry.amount.toLocaleString()}
                                            </span>
                                            <button onClick={() => entry.type === 'deposit' ? handleDeleteDeposit(entry.id) : handleDeleteExpense(entry.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px' }}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
