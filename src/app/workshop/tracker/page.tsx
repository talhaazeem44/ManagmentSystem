'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { todayDateInputValue } from '@/lib/dates';

type PaymentMode = 'CASH' | 'BANK_TRANSFER';

interface DepositRecord {
    _id: string;
    amount: number;
    note?: string;
    paymentMode?: PaymentMode;
    date: string;
}

interface ExpenseRecord {
    _id: string;
    amount: number;
    description: string;
    paymentMode?: PaymentMode;
    date: string;
}

interface MarginStats {
    totalMargin: number;
    totalLabour: number;
    workshopExpenseTotal: number;
    jobCount: number;
}

interface OpeningBalance {
    _id: string;
    cashAmount: number;
    bankAmount: number;
    asOfDate: string;
    note?: string;
}

/** Entries saved before payment mode existed are cash — that is what they were. */
const isBank = (r: { paymentMode?: PaymentMode }) => r.paymentMode === 'BANK_TRANSFER';
const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

export default function WorkshopTrackerPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [deposits, setDeposits] = useState<DepositRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [depositForm, setDepositForm] = useState({ amount: '', note: '', paymentMode: 'CASH' as PaymentMode, date: todayDateInputValue() });
    const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', paymentMode: 'CASH' as PaymentMode, date: todayDateInputValue() });
    const [savingDeposit, setSavingDeposit] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    const [trackerMonth, setTrackerMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [marginStats, setMarginStats] = useState<MarginStats | null>(null);

    // Cash in Hand / Bank count from the most recent "opening balance" reset point forward —
    // not from every deposit/expense ever entered. Old/unreliable history before that point
    // is simply ignored; this is the clean-slate fix for a confused/duplicated cash history.
    const [openingBalance, setOpeningBalance] = useState<OpeningBalance | null>(null);
    const [sinceOpeningDeposits, setSinceOpeningDeposits] = useState<DepositRecord[]>([]);
    const [sinceOpeningExpenses, setSinceOpeningExpenses] = useState<ExpenseRecord[]>([]);
    // Credit payments collected (cash/bank actually walking in the door) since the opening
    // balance — these never created a "Daily Sale" deposit entry on their own, so without this
    // they'd silently never show up in Cash in Hand even though real money was received.
    const [creditPaymentsCash, setCreditPaymentsCash] = useState(0);
    const [creditPaymentsBank, setCreditPaymentsBank] = useState(0);
    const [showCalculation, setShowCalculation] = useState(false);
    const [showSetBalance, setShowSetBalance] = useState(false);
    const [balanceForm, setBalanceForm] = useState({ cashAmount: '', bankAmount: '', note: '' });
    const [savingBalance, setSavingBalance] = useState(false);

    useEffect(() => { fetchTrackerData(); }, [trackerMonth]);

    const fetchTrackerData = async () => {
        const [year, month] = trackerMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        try {
            const [depRes, expRes, marginRes, balRes] = await Promise.all([
                fetch(`/api/workshop/deposits?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
                fetch(`/api/expenses?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
                fetch(`/api/workshop/stats?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
                fetch('/api/workshop/cash-balance'),
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
            if (marginRes.ok) setMarginStats(await marginRes.json());

            const balData = balRes.ok ? await balRes.json() : { latest: null };
            const latest: OpeningBalance | null = balData.latest;
            setOpeningBalance(latest);

            // Cash in Hand / Bank count from the opening balance's date forward — if that date
            // falls after the end of the selected month (viewing an older month than the reset
            // point), there's no valid baseline, so just fall back to the plain month total.
            const fromDate = latest && new Date(latest.asOfDate) <= end ? new Date(latest.asOfDate) : start;
            const [sinceDepRes, sinceExpRes, sinceStatsRes] = await Promise.all([
                fetch(`/api/workshop/deposits?startDate=${fromDate.toISOString()}&endDate=${end.toISOString()}`),
                fetch(`/api/expenses?startDate=${fromDate.toISOString()}&endDate=${end.toISOString()}`),
                fetch(`/api/workshop/stats?startDate=${fromDate.toISOString()}&endDate=${end.toISOString()}`),
            ]);
            if (sinceDepRes.ok) setSinceOpeningDeposits(await sinceDepRes.json());
            if (sinceExpRes.ok) {
                const all = await sinceExpRes.json();
                setSinceOpeningExpenses(all.filter((e: any) => e.deductFrom === 'WORKSHOP'));
            }
            if (sinceStatsRes.ok) {
                const stats = await sinceStatsRes.json();
                setCreditPaymentsCash(Number(stats.creditPaymentsCash || 0));
                setCreditPaymentsBank(Number(stats.creditPaymentsBank || 0));
            }
        } catch {
            showToast('Could not refresh tracker data — check your connection', 'error');
        }
    };

    const handleSetBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!balanceForm.cashAmount && !balanceForm.bankAmount) return;
        setSavingBalance(true);
        try {
            const res = await fetch('/api/workshop/cash-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cashAmount: Number(balanceForm.cashAmount) || 0,
                    bankAmount: Number(balanceForm.bankAmount) || 0,
                    note: balanceForm.note,
                    asOfDate: todayDateInputValue(),
                }),
            });
            if (res.ok) {
                showToast('Starting balance set — tracking from here on', 'success');
                setBalanceForm({ cashAmount: '', bankAmount: '', note: '' });
                setShowSetBalance(false);
                await fetchTrackerData();
            } else {
                showToast('Failed to save starting balance', 'error');
            }
        } catch {
            showToast('Error saving — check your connection', 'error');
        } finally {
            setSavingBalance(false);
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
                body: JSON.stringify({ amount: Number(depositForm.amount), note: depositForm.note, paymentMode: depositForm.paymentMode, date: depositForm.date }),
            });
            if (res.ok) {
                showToast('Deposit saved', 'success');
                setDepositForm({ amount: '', note: '', paymentMode: 'CASH', date: todayDateInputValue() });
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
                body: JSON.stringify({ amount: Number(expenseForm.amount), description: expenseForm.description, deductFrom: 'WORKSHOP', paymentMode: expenseForm.paymentMode, date: expenseForm.date }),
            });
            if (res.ok) {
                showToast('Expense saved', 'success');
                setExpenseForm({ amount: '', description: '', paymentMode: 'CASH', date: todayDateInputValue() });
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

    // "Deposits"/"Expenses" cards show just this month's own activity — the manual "Daily Sale"
    // entry IS the real cash record for this shop (it's logged once per day already, separate
    // from individual job bills), so these are not combined with bill totals.
    const totalDeposits = sum(deposits);
    const totalExpenses = sum(expenses);
    const cashIn = sum(deposits.filter(d => !isBank(d)));
    const bankIn = sum(deposits.filter(isBank));
    const cashOut = sum(expenses.filter(e => !isBank(e)));
    const bankOut = sum(expenses.filter(isBank));

    // Cash in Hand / Bank start from the opening balance (your real counted cash/bank at the
    // moment you set it) and only add up what's happened SINCE then — never older history.
    const baseCash = openingBalance ? openingBalance.cashAmount : 0;
    const baseBank = openingBalance ? openingBalance.bankAmount : 0;
    const runningCashIn = baseCash + sum(sinceOpeningDeposits.filter(d => !isBank(d))) + creditPaymentsCash;
    const runningBankIn = baseBank + sum(sinceOpeningDeposits.filter(isBank)) + creditPaymentsBank;
    const runningCashOut = sum(sinceOpeningExpenses.filter(e => !isBank(e)));
    const runningBankOut = sum(sinceOpeningExpenses.filter(isBank));

    const netCash = runningCashIn - runningCashOut;    // physical cash in hand, running balance
    const netBank = runningBankIn - runningBankOut;    // money through the bank, running balance
    const netTotal = netCash + netBank;

    const monthLabel = new Date(trackerMonth + '-01').toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

    const trackerLog: { id: string; type: 'deposit' | 'expense'; amount: number; label: string; bank: boolean; date: string }[] = [
        ...deposits.map(d => ({ id: d._id, type: 'deposit' as const, amount: d.amount, label: d.note || 'Daily Sale', bank: isBank(d), date: d.date })),
        ...expenses.map(e => ({ id: e._id, type: 'expense' as const, amount: e.amount, label: e.description, bank: isBank(e), date: e.date })),
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

                {/* ── Opening Balance — the clean-slate reset point ── */}
                <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>⚙️ Starting Balance</div>
                            {openingBalance ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                    Rs. {openingBalance.cashAmount.toLocaleString()} cash + Rs. {openingBalance.bankAmount.toLocaleString()} bank, set as of {new Date(openingBalance.asOfDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {openingBalance.note ? ` — ${openingBalance.note}` : ''}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                    Not set yet — Cash in Hand below is just counting from the start of this month.
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowSetBalance(v => !v)}
                            style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer' }}>
                            {showSetBalance ? '✕ Cancel' : (openingBalance ? '↻ Reset Starting Balance' : '✅ Set Starting Balance')}
                        </button>
                    </div>

                    {showSetBalance && (
                        <form onSubmit={handleSetBalance} style={{ marginTop: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>Cash you physically have right now</label>
                                <input type="number" className="input" style={{ width: '160px' }} placeholder="Rs."
                                    value={balanceForm.cashAmount}
                                    onChange={e => setBalanceForm({ ...balanceForm, cashAmount: e.target.value })} min="0" />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>Bank balance right now</label>
                                <input type="number" className="input" style={{ width: '160px' }} placeholder="Rs."
                                    value={balanceForm.bankAmount}
                                    onChange={e => setBalanceForm({ ...balanceForm, bankAmount: e.target.value })} min="0" />
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '160px' }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>Note (optional)</label>
                                <input className="input" placeholder="e.g. counted today"
                                    value={balanceForm.note}
                                    onChange={e => setBalanceForm({ ...balanceForm, note: e.target.value })} />
                            </div>
                            <button type="submit" disabled={savingBalance}
                                style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                {savingBalance ? 'Saving...' : 'Confirm'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Summary Cards — cash and bank are kept on separate cards so the
                    drawer figure is never mixed with money that moved by transfer. */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>{monthLabel} — Deposits</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>Rs. {totalDeposits.toLocaleString()}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                            💵 {cashIn.toLocaleString()} · 🏦 {bankIn.toLocaleString()}
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>Expenses</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>− Rs. {totalExpenses.toLocaleString()}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                            💵 {cashOut.toLocaleString()} · 🏦 {bankOut.toLocaleString()}
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: `4px solid ${netCash >= 0 ? '#3b82f6' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.7rem', color: netCash >= 0 ? '#3b82f6' : '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>💵 Cash in Hand</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: netCash >= 0 ? '#3b82f6' : '#ef4444' }}>Rs. {netCash.toLocaleString()}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                            In {runningCashIn.toLocaleString()} · Out {runningCashOut.toLocaleString()} (since starting balance)
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: `4px solid ${netBank >= 0 ? '#8b5cf6' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.7rem', color: netBank >= 0 ? '#8b5cf6' : '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.35rem' }}>🏦 Bank</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: netBank >= 0 ? '#8b5cf6' : '#ef4444' }}>Rs. {netBank.toLocaleString()}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                            In {runningBankIn.toLocaleString()} · Out {runningBankOut.toLocaleString()} (since starting balance)
                        </div>
                    </div>
                </div>

                {/* Cash + bank together — running balance, same basis as the two cards above */}
                <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Total Balance (Cash + Bank) — Running Total
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: netTotal >= 0 ? '#10b981' : '#ef4444' }}>
                        Rs. {netTotal.toLocaleString()}
                    </span>
                </div>

                {/* ── Full transparency: exact formula + real numbers behind every card above ── */}
                <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                    <button onClick={() => setShowCalculation(v => !v)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>🔍 How is this calculated?</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{showCalculation ? '▲ Hide' : '▼ Show'}</span>
                    </button>

                    {showCalculation && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.06)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>
                                    {monthLabel} — Deposits = sum of every &quot;Daily Sale&quot; entry YOU added this month ({deposits.length} entries)
                                </div>
                                <div style={{ fontSize: '0.78rem' }}>
                                    💵 Cash: {sum(deposits.filter(d => !isBank(d))).toLocaleString()} + 🏦 Bank: {sum(deposits.filter(isBank)).toLocaleString()} = <strong>Rs. {totalDeposits.toLocaleString()}</strong>
                                </div>
                                {deposits.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {deposits.map(d => (
                                            <div key={d._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                <span>{new Date(d.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} {isBank(d) ? '🏦' : '💵'} {d.note || '—'}</span>
                                                <span>Rs. {d.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.06)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
                                    {monthLabel} — Expenses = sum of every expense logged this month ({expenses.length} entries)
                                </div>
                                <div style={{ fontSize: '0.78rem' }}>
                                    💵 Cash: {sum(expenses.filter(e => !isBank(e))).toLocaleString()} + 🏦 Bank: {sum(expenses.filter(isBank)).toLocaleString()} = <strong>Rs. {totalExpenses.toLocaleString()}</strong>
                                </div>
                                {expenses.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {expenses.map(e => (
                                            <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                <span>{new Date(e.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} {isBank(e) ? '🏦' : '💵'} {e.description}</span>
                                                <span>Rs. {e.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.5rem' }}>
                                    💵 Cash in Hand = Starting Balance + cash deposits since then + credit payments received in cash − cash expenses since then
                                </div>
                                <div style={{ fontSize: '0.78rem' }}>
                                    Starting balance (cash): Rs. {baseCash.toLocaleString()}
                                    <br />+ Cash deposits since ({sinceOpeningDeposits.filter(d => !isBank(d)).length} entries): Rs. {sum(sinceOpeningDeposits.filter(d => !isBank(d))).toLocaleString()}
                                    <br />+ Credit payments received as cash: Rs. {creditPaymentsCash.toLocaleString()}
                                    <br />− Cash expenses since ({sinceOpeningExpenses.filter(e => !isBank(e)).length} entries): Rs. {runningCashOut.toLocaleString()}
                                    <br />= <strong style={{ color: netCash < 0 ? '#ef4444' : '#3b82f6' }}>Rs. {netCash.toLocaleString()}</strong>
                                </div>
                            </div>

                            <div style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.06)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.5rem' }}>
                                    🏦 Bank = Starting Balance + bank deposits since then + credit payments received in bank − bank expenses since then
                                </div>
                                <div style={{ fontSize: '0.78rem' }}>
                                    Starting balance (bank): Rs. {baseBank.toLocaleString()}
                                    <br />+ Bank deposits since ({sinceOpeningDeposits.filter(isBank).length} entries): Rs. {sum(sinceOpeningDeposits.filter(isBank)).toLocaleString()}
                                    <br />+ Credit payments received as bank transfer: Rs. {creditPaymentsBank.toLocaleString()}
                                    <br />− Bank expenses since ({sinceOpeningExpenses.filter(isBank).length} entries): Rs. {runningBankOut.toLocaleString()}
                                    <br />= <strong style={{ color: netBank < 0 ? '#ef4444' : '#8b5cf6' }}>Rs. {netBank.toLocaleString()}</strong>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                Note: Cash in Hand and Bank count from your Starting Balance forward only — not from before it was set. Deposits and Expenses cards above are this month only. Credit payments (customers paying off old workshop bills) are included even though they don&apos;t appear as a &quot;Daily Sale&quot; entry.
                            </div>
                        </div>
                    )}
                </div>

                {/* Margin — this is the actual profit from service bills this month, separate from
                    the cash-flow cards above (which are the manual daily-sale/expense ledger). Shown
                    here too since this is where cash actually gets closed out and reconciled. */}
                {marginStats && (
                    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '2px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.04)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                            💰 {monthLabel} — Margin ({marginStats.jobCount} job{marginStats.jobCount !== 1 ? 's' : ''})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.7rem', background: 'var(--color-bg-elevated)', borderRadius: '6px' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Earned (Labour + Parts)</span>
                                <strong style={{ color: '#10b981' }}>Rs. {Math.round(marginStats.totalMargin).toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.7rem', background: 'rgba(239,68,68,0.06)', borderRadius: '6px' }}>
                                <span style={{ color: '#ef4444' }}>Spent (Expenses)</span>
                                <strong style={{ color: '#ef4444' }}>− Rs. {Math.round(marginStats.workshopExpenseTotal).toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.9rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Take-Home</span>
                                <strong style={{ fontSize: '1.15rem', color: (marginStats.totalMargin - marginStats.workshopExpenseTotal) < 0 ? '#ef4444' : '#10b981' }}>
                                    Rs. {Math.round(Math.abs(marginStats.totalMargin - marginStats.workshopExpenseTotal)).toLocaleString()}
                                </strong>
                                <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, background: (marginStats.totalMargin - marginStats.workshopExpenseTotal) < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: (marginStats.totalMargin - marginStats.workshopExpenseTotal) < 0 ? '#ef4444' : '#10b981' }}>
                                    {(marginStats.totalMargin - marginStats.workshopExpenseTotal) < 0 ? 'LOSS' : 'PROFIT'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

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
                                <select className="select" value={depositForm.paymentMode}
                                    onChange={e => setDepositForm({ ...depositForm, paymentMode: e.target.value as PaymentMode })}>
                                    <option value="CASH">Cash</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                </select>
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
                                <select className="select" value={expenseForm.paymentMode}
                                    onChange={e => setExpenseForm({ ...expenseForm, paymentMode: e.target.value as PaymentMode })}>
                                    <option value="CASH">Paid by Cash</option>
                                    <option value="BANK_TRANSFER">Paid by Bank Transfer</option>
                                </select>
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
                                                {' · '}{entry.bank ? '🏦 Bank' : '💵 Cash'}
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
