'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { todayDateInputValue, dateInputValue } from '@/lib/dates';

type PaymentMode = 'CASH' | 'BANK_TRANSFER';
type FilterType = 'today' | 'yesterday' | 'week' | 'month' | 'last-month' | 'custom';
type ActiveTab = 'overview' | 'expenses' | 'margin' | 'transactions';

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
    category?: string;
    deductFrom?: string;
    paymentMode?: PaymentMode;
    date: string;
}

interface WorkshopJobRecord {
    _id: string;
    customerName: string;
    customerMobile?: string;
    bikeNumber?: string;
    mechanicName?: string;
    serviceType: string;
    serviceCharges: number;
    partsRevenue: number;
    partsMargin: number;
    totalAmount: number;
    margin: number;
    paymentMode?: string;
    date: string;
    itemsCount?: number;
}

interface MarginStats {
    totalRevenue?: number;
    totalCollected?: number;
    totalMargin: number;
    totalLabour: number;
    totalPartsRevenue?: number;
    workshopExpenseTotal: number;
    jobCount: number;
    avgTicket?: number;
    byServiceType?: Record<string, { count: number; revenue: number; margin: number }>;
    byMechanic?: Record<string, { count: number; revenue: number; margin: number }>;
    jobs?: WorkshopJobRecord[];
    recentJobs?: Array<{
        _id: string;
        customerName: string;
        bikeNumber?: string;
        serviceType: string;
        totalAmount: number;
        margin: number;
        paymentMode?: string;
        date: string;
    }>;
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

    // ── Active View Tab ──
    const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

    // ── Date Filtering ──
    const [filterType, setFilterType] = useState<FilterType>('month');
    const [trackerMonth, setTrackerMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [customStartDate, setCustomStartDate] = useState(todayDateInputValue());
    const [customEndDate, setCustomEndDate] = useState(todayDateInputValue());

    // ── Data states ──
    const [deposits, setDeposits] = useState<DepositRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [marginStats, setMarginStats] = useState<MarginStats | null>(null);
    const [loading, setLoading] = useState(false);

    // ── Quick forms ──
    const [depositForm, setDepositForm] = useState({ amount: '', note: '', paymentMode: 'CASH' as PaymentMode, date: todayDateInputValue() });
    const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', paymentMode: 'CASH' as PaymentMode, date: todayDateInputValue() });
    const [savingDeposit, setSavingDeposit] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);
    const [transferForm, setTransferForm] = useState({ amount: '', note: '', date: todayDateInputValue() });
    const [savingTransfer, setSavingTransfer] = useState(false);

    // ── Starting balance reset point ──
    const [openingBalance, setOpeningBalance] = useState<OpeningBalance | null>(null);
    const [sinceOpeningDeposits, setSinceOpeningDeposits] = useState<DepositRecord[]>([]);
    const [sinceOpeningExpenses, setSinceOpeningExpenses] = useState<ExpenseRecord[]>([]);
    const [directCashSinceOpening, setDirectCashSinceOpening] = useState(0);
    const [directBankSinceOpening, setDirectBankSinceOpening] = useState(0);
    const [creditPaymentsCash, setCreditPaymentsCash] = useState(0);
    const [creditPaymentsBank, setCreditPaymentsBank] = useState(0);
    const [showCalculation, setShowCalculation] = useState(false);
    const [showSetBalance, setShowSetBalance] = useState(false);
    const [balanceForm, setBalanceForm] = useState({ cashAmount: '', bankAmount: '', note: '' });
    const [savingBalance, setSavingBalance] = useState(false);

    // ── Filters inside detail views ──
    const [expenseSearch, setExpenseSearch] = useState('');
    const [expenseModeFilter, setExpenseModeFilter] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER'>('ALL');
    const [jobSearch, setJobSearch] = useState('');
    const [jobModeFilter, setJobModeFilter] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER' | 'CREDIT'>('ALL');
    const [jobMechanicFilter, setJobMechanicFilter] = useState<string>('ALL');

    // ── Compute current date bounds for API queries ──
    const rangeBounds = useMemo(() => {
        const todayStr = todayDateInputValue();
        const today = new Date(todayStr + 'T00:00:00+05:00');

        if (filterType === 'today') {
            const s = new Date(todayStr + 'T00:00:00+05:00');
            const e = new Date(todayStr + 'T23:59:59.999+05:00');
            return {
                start: s,
                end: e,
                label: `Today (${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })})`,
            };
        }
        if (filterType === 'yesterday') {
            const yDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const yStr = dateInputValue(yDate);
            const s = new Date(yStr + 'T00:00:00+05:00');
            const e = new Date(yStr + 'T23:59:59.999+05:00');
            return {
                start: s,
                end: e,
                label: `Yesterday (${yDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })})`,
            };
        }
        if (filterType === 'week') {
            const wDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
            const wStr = dateInputValue(wDate);
            const s = new Date(wStr + 'T00:00:00+05:00');
            const e = new Date(todayStr + 'T23:59:59.999+05:00');
            return { start: s, end: e, label: 'Last 7 Days' };
        }
        if (filterType === 'last-month') {
            const now = new Date();
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const y = prevMonthDate.getFullYear();
            const m = prevMonthDate.getMonth() + 1;
            const lastDay = new Date(y, m, 0).getDate();
            const s = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00+05:00`);
            const e = new Date(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:00`);
            return { start: s, end: e, label: prevMonthDate.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }) };
        }
        if (filterType === 'custom') {
            const sDate = customStartDate || todayStr;
            const eDate = customEndDate || todayStr;
            const s = new Date(sDate + 'T00:00:00+05:00');
            const e = new Date(eDate + 'T23:59:59.999+05:00');
            const formattedS = new Date(sDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
            const formattedE = new Date(eDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
            return { start: s, end: e, label: sDate === eDate ? formattedS : `${formattedS} – ${formattedE}` };
        }

        // 'month'
        const [year, month] = trackerMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const s = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:00`);
        const e = new Date(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:00`);
        const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
        return { start: s, end: e, label: monthName };
    }, [filterType, trackerMonth, customStartDate, customEndDate]);

    const fetchTrackerData = useCallback(async () => {
        setLoading(true);
        const { start, end } = rangeBounds;
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
                showToast('Could not refresh deposits list', 'error');
            }

            if (expRes.ok) {
                const all: ExpenseRecord[] = await expRes.json();
                setExpenses(all.filter(e => e.deductFrom === 'WORKSHOP'));
            } else {
                showToast('Could not refresh expenses list', 'error');
            }

            if (marginRes.ok) {
                setMarginStats(await marginRes.json());
            }

            const balData = balRes.ok ? await balRes.json() : { latest: null };
            const latest: OpeningBalance | null = balData.latest;
            setOpeningBalance(latest);

            // Cash in Hand / Bank count from the opening balance's date forward
            const fromDate = latest && new Date(latest.asOfDate) <= end ? new Date(latest.asOfDate) : start;
            const [sinceDepRes, sinceExpRes, sinceStatsRes] = await Promise.all([
                fetch(`/api/workshop/deposits?startDate=${fromDate.toISOString()}&endDate=${end.toISOString()}`),
                fetch(`/api/expenses?startDate=${fromDate.toISOString()}&endDate=${end.toISOString()}`),
                fetch(`/api/workshop/stats?startDate=${fromDate.toISOString()}&endDate=${end.toISOString()}`),
            ]);

            if (sinceDepRes.ok) setSinceOpeningDeposits(await sinceDepRes.json());
            if (sinceExpRes.ok) {
                const all: ExpenseRecord[] = await sinceExpRes.json();
                setSinceOpeningExpenses(all.filter(e => e.deductFrom === 'WORKSHOP'));
            }
            if (sinceStatsRes.ok) {
                const stats = await sinceStatsRes.json();
                setDirectCashSinceOpening(Number(stats.directCashReceived || 0));
                setDirectBankSinceOpening(Number(stats.directBankReceived || 0));
                setCreditPaymentsCash(Number(stats.creditPaymentsCash || 0));
                setCreditPaymentsBank(Number(stats.creditPaymentsBank || 0));
            }
        } catch {
            showToast('Could not refresh tracker data — check your connection', 'error');
        } finally {
            setLoading(false);
        }
    }, [rangeBounds, showToast]);

    useEffect(() => {
        fetchTrackerData();
    }, [fetchTrackerData]);

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
        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message || 'Error saving deposit';
            showToast(msg, 'error');
        } finally {
            setSavingDeposit(false);
        }
    };

    // A part bought for a specific job is already priced into that job's bill (totalCost/
    // margin) — logging it again here as a cash expense double-counts it and makes the
    // shop look like it's losing more than it really is. Nudge whoever's entering the
    // expense to check before that happens, instead of catching it a month later in the
    // margin report.
    const findMatchingJob = (description: string, dateStr: string): WorkshopJobRecord | null => {
        const jobs = marginStats?.jobs || [];
        const descUpper = description.toUpperCase();
        const expenseDate = new Date(dateStr);
        for (const job of jobs) {
            const jobDate = new Date(job.date);
            const daysApart = Math.abs(expenseDate.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysApart > 3) continue;
            const names = [job.customerName, job.mechanicName, job.bikeNumber].filter((n): n is string => !!n && n !== '—' && n.length >= 3);
            if (names.some(n => descUpper.includes(n.toUpperCase()))) return job;
        }
        return null;
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.amount || !expenseForm.description) return;

        const matchedJob = findMatchingJob(expenseForm.description, expenseForm.date);
        if (matchedJob) {
            const proceed = window.confirm(
                `This looks related to ${matchedJob.customerName}'s bill (Rs. ${matchedJob.totalAmount} on ${dateInputValue(matchedJob.date)}) — that bill's parts cost already includes this.\n\nAdding it again as an expense will double-count it and inflate the loss in the margin report.\n\nAdd anyway?`
            );
            if (!proceed) return;
        }

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
        } catch (err: unknown) {
            const msg = (err as { message?: string })?.message || 'Error saving expense';
            showToast(msg, 'error');
        } finally {
            setSavingExpense(false);
        }
    };

    // Moving cash to the bank is a transfer, not a business expense — it's recorded as a
    // paired Expense (drains Cash in Hand) + WorkshopDeposit (fills Bank Balance). The
    // Expense side is tagged category: 'Bank Transfer' so the margin/take-home report
    // (which only counts real spending) excludes it — see /api/workshop/stats.
    const handleAddTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(transferForm.amount);
        if (!amount || amount <= 0) return;
        setSavingTransfer(true);
        try {
            const noteSuffix = transferForm.note ? ` — ${transferForm.note}` : '';
            const expRes = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    description: `Cash transferred to bank${noteSuffix}`,
                    category: 'Bank Transfer',
                    deductFrom: 'WORKSHOP',
                    paymentMode: 'CASH',
                    date: transferForm.date,
                }),
            });
            if (!expRes.ok) {
                showToast('Failed to record transfer', 'error');
                return;
            }
            const depRes = await fetch('/api/workshop/deposits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, note: `Cash transfer${noteSuffix}`, paymentMode: 'BANK_TRANSFER', date: transferForm.date }),
            });
            if (!depRes.ok) {
                showToast(`Cash deducted but the bank side failed — add a Rs. ${amount.toLocaleString()} bank deposit manually`, 'error');
                await fetchTrackerData();
                return;
            }
            showToast(`Rs. ${amount.toLocaleString()} moved from cash to bank`, 'success');
            setTransferForm({ amount: '', note: '', date: todayDateInputValue() });
            await fetchTrackerData();
        } catch {
            showToast('Error saving transfer — check your connection', 'error');
        } finally {
            setSavingTransfer(false);
        }
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

    // ── Export helpers ──
    const exportExpensesToExcel = async () => {
        if (expenses.length === 0) {
            showToast('No expenses to export', 'info');
            return;
        }
        const XLSX = await import('xlsx');
        const rows: (string | number)[][] = [
            ['Workshop Expenses Report'],
            [`Period: ${rangeBounds.label}`],
            [],
            ['Date', 'Description', 'Payment Mode', 'Amount (PKR)'],
        ];

        expenses.forEach(e => {
            rows.push([
                new Date(e.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
                e.description,
                e.paymentMode === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Cash',
                e.amount,
            ]);
        });

        rows.push([]);
        rows.push(['Total Expenses', '', '', totalExpenses]);
        rows.push(['Cash Expenses', '', '', cashOut]);
        rows.push(['Bank Expenses', '', '', bankOut]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 16 }, { wch: 35 }, { wch: 18 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
        XLSX.writeFile(wb, `Workshop-Expenses-${rangeBounds.label.replace(/\s+/g, '_')}.xlsx`);
        showToast('Expenses exported to Excel', 'success');
    };

    const exportMarginJobsToExcel = async () => {
        const jobs = marginStats?.jobs || [];
        if (jobs.length === 0) {
            showToast('No jobs to export', 'info');
            return;
        }
        const XLSX = await import('xlsx');
        const rows: (string | number)[][] = [
            ['Workshop Margin & Jobs Report'],
            [`Period: ${rangeBounds.label}`],
            [`Total Jobs: ${marginStats?.jobCount || 0}`],
            [`Gross Margin: PKR ${Math.round(marginStats?.totalMargin || 0)}`],
            [`Labour Charges: PKR ${Math.round(marginStats?.totalLabour || 0)}`],
            [`Parts Margin: PKR ${Math.round((marginStats?.totalMargin || 0) - (marginStats?.totalLabour || 0))}`],
            [`Workshop Expenses: PKR ${Math.round(marginStats?.workshopExpenseTotal || 0)}`],
            [`Net Take-Home: PKR ${Math.round(netMargin)}`],
            [],
            ['Date', 'Customer', 'Bike #', 'Service Type', 'Mechanic', 'Payment Mode', 'Labour (PKR)', 'Parts Margin (PKR)', 'Bill Total (PKR)', 'Total Margin (PKR)'],
        ];

        jobs.forEach(j => {
            rows.push([
                new Date(j.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
                j.customerName,
                j.bikeNumber || '—',
                j.serviceType,
                j.mechanicName || '—',
                j.paymentMode || 'CASH',
                j.serviceCharges,
                j.partsMargin,
                j.totalAmount,
                j.margin,
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Jobs-Margin');
        XLSX.writeFile(wb, `Workshop-Margin-Jobs-${rangeBounds.label.replace(/\s+/g, '_')}.xlsx`);
        showToast('Margin jobs report exported to Excel', 'success');
    };

    // ── Aggregated numbers ──
    const totalDeposits = sum(deposits);
    const totalExpenses = sum(expenses);
    const cashIn = sum(deposits.filter(d => !isBank(d)));
    const bankIn = sum(deposits.filter(isBank));
    const cashOut = sum(expenses.filter(e => !isBank(e)));
    const bankOut = sum(expenses.filter(isBank));

    // Running Balance from Opening Balance forward
    const baseCash = openingBalance ? openingBalance.cashAmount : 0;
    const baseBank = openingBalance ? openingBalance.bankAmount : 0;
    const runningCashIn = baseCash + sum(sinceOpeningDeposits.filter(d => !isBank(d)));
    const runningBankIn = baseBank + sum(sinceOpeningDeposits.filter(isBank)) + directBankSinceOpening + creditPaymentsBank;
    const runningCashOut = sum(sinceOpeningExpenses.filter(e => !isBank(e)));
    const runningBankOut = sum(sinceOpeningExpenses.filter(isBank));

    const netCash = runningCashIn - runningCashOut;
    const netBank = runningBankIn - runningBankOut;
    const netTotal = netCash + netBank;

    // Margin Calculations
    const labourMargin = marginStats?.totalLabour || 0;
    const totalGrossMargin = marginStats?.totalMargin || 0;
    const partsMargin = Math.max(0, totalGrossMargin - labourMargin);
    const workshopExpDeduction = marginStats?.workshopExpenseTotal || 0;
    const netMargin = totalGrossMargin - workshopExpDeduction;

    // Filtered lists for detail tabs
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesText = !expenseSearch || e.description.toLowerCase().includes(expenseSearch.toLowerCase());
            const matchesMode =
                expenseModeFilter === 'ALL' ||
                (expenseModeFilter === 'BANK_TRANSFER' ? isBank(e) : !isBank(e));
            return matchesText && matchesMode;
        });
    }, [expenses, expenseSearch, expenseModeFilter]);

    const allJobs = useMemo(() => marginStats?.jobs || [], [marginStats]);
    const mechanicsList = useMemo(() => {
        const set = new Set<string>();
        allJobs.forEach(j => {
            if (j.mechanicName && j.mechanicName !== '—') set.add(j.mechanicName);
        });
        return Array.from(set);
    }, [allJobs]);

    const filteredJobs = useMemo(() => {
        return allJobs.filter(j => {
            const q = jobSearch.toLowerCase();
            const matchesText =
                !jobSearch ||
                j.customerName.toLowerCase().includes(q) ||
                (j.bikeNumber && j.bikeNumber.toLowerCase().includes(q)) ||
                (j.mechanicName && j.mechanicName.toLowerCase().includes(q)) ||
                j.serviceType.toLowerCase().includes(q);

            const matchesMode = jobModeFilter === 'ALL' || j.paymentMode === jobModeFilter;
            const matchesMechanic = jobMechanicFilter === 'ALL' || j.mechanicName === jobMechanicFilter;
            return matchesText && matchesMode && matchesMechanic;
        });
    }, [allJobs, jobSearch, jobModeFilter, jobMechanicFilter]);

    const trackerLog: { id: string; type: 'deposit' | 'expense'; amount: number; label: string; bank: boolean; date: string }[] = useMemo(() => {
        return [
            ...deposits.map(d => ({ id: d._id, type: 'deposit' as const, amount: d.amount, label: d.note || 'Daily Sale', bank: isBank(d), date: d.date })),
            ...expenses.map(e => ({ id: e._id, type: 'expense' as const, amount: e.amount, label: e.description, bank: isBank(e), date: e.date })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [deposits, expenses]);

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                {/* ── Top Header & Date Filtration Controls ── */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>💵</span> Workshop Cash Tracker
                            </h1>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                                Cash, bank balances, expenses, and workshop margin
                            </p>
                        </div>

                        {/* Active Date Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-bg-elevated)', padding: '0.4rem 0.85rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: '0.9rem' }}>📅</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                {rangeBounds.label}
                            </span>
                            {loading && <span style={{ fontSize: '0.75rem', color: '#10b981' }}>⏳</span>}
                        </div>
                    </div>

                    {/* Filter Pills / Presets & Custom Date Pickers */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', background: 'var(--color-bg-card)', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginRight: '0.3rem' }}>
                            Filter:
                        </span>

                        {(['today', 'yesterday', 'week', 'month', 'last-month', 'custom'] as FilterType[]).map(ft => (
                            <button
                                key={ft}
                                onClick={() => setFilterType(ft)}
                                className={ft === filterType ? 'btn btn-primary' : 'btn btn-secondary'}
                                style={{
                                    fontSize: '0.78rem',
                                    padding: '0.35rem 0.75rem',
                                    fontWeight: ft === filterType ? 700 : 500,
                                }}
                            >
                                {ft === 'today' && 'Today'}
                                {ft === 'yesterday' && 'Yesterday'}
                                {ft === 'week' && '7 Days'}
                                {ft === 'month' && 'This Month'}
                                {ft === 'last-month' && 'Last Month'}
                                {ft === 'custom' && '📅 Custom Date Range'}
                            </button>
                        ))}

                        {/* Month Picker dropdown when 'month' is selected */}
                        {filterType === 'month' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Month:</span>
                                <input
                                    type="month"
                                    className="input"
                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', maxWidth: '150px' }}
                                    value={trackerMonth}
                                    onChange={e => setTrackerMonth(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Custom Date Inputs when 'custom' is selected */}
                        {filterType === 'custom' && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '8px',
                                    background: 'rgba(16,185,129,0.08)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    marginLeft: '0.3rem',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>From:</span>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', maxWidth: '145px' }}
                                    value={customStartDate}
                                    onChange={e => setCustomStartDate(e.target.value)}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>To:</span>
                                <input
                                    type="date"
                                    className="input"
                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', maxWidth: '145px' }}
                                    value={customEndDate}
                                    onChange={e => setCustomEndDate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Starting Balance — Clean Slate Reset Point ── */}
                <div className="card" style={{ padding: '0.9rem 1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
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
                                    Not set yet — Cash in Hand counts from the start of this period.
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                if (!showSetBalance && openingBalance) {
                                    setBalanceForm({ cashAmount: String(openingBalance.cashAmount), bankAmount: String(openingBalance.bankAmount), note: '' });
                                }
                                setShowSetBalance(v => !v);
                            }}
                            style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '0.35rem 0.85rem', cursor: 'pointer' }}
                        >
                            {showSetBalance ? '✕ Cancel' : (openingBalance ? '↻ Reset Starting Balance' : '✅ Set Starting Balance')}
                        </button>
                    </div>

                    {showSetBalance && (
                        <form onSubmit={handleSetBalance} style={{ marginTop: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label" style={{ fontSize: '0.7rem' }}>Cash physically in hand</label>
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

                {/* ── Summary KPI Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    {/* Deposits card */}
                    <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.68rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>
                            {rangeBounds.label} — Deposits
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
                            Rs. {totalDeposits.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            💵 {cashIn.toLocaleString()} · 🏦 {bankIn.toLocaleString()}
                        </div>
                    </div>

                    {/* Expenses card */}
                    <div
                        className="card"
                        style={{ padding: '1.1rem', textAlign: 'center', borderLeft: '4px solid #ef4444', cursor: 'pointer' }}
                        onClick={() => setActiveTab('expenses')}
                        title="Click to view detailed expenses"
                    >
                        <div style={{ fontSize: '0.68rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                            <span>Expenses ({expenses.length})</span>
                            <span style={{ fontSize: '0.65rem' }}>🔍</span>
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444' }}>
                            − Rs. {totalExpenses.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            💵 {cashOut.toLocaleString()} · 🏦 {bankOut.toLocaleString()}
                        </div>
                    </div>

                    {/* Cash in Hand */}
                    <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderLeft: `4px solid ${netCash >= 0 ? '#3b82f6' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.68rem', color: netCash >= 0 ? '#3b82f6' : '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>
                            💵 Cash in Hand
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: netCash >= 0 ? '#3b82f6' : '#ef4444' }}>
                            Rs. {netCash.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            In {runningCashIn.toLocaleString()} · Out {runningCashOut.toLocaleString()}
                        </div>
                    </div>

                    {/* Bank Balance */}
                    <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderLeft: `4px solid ${netBank >= 0 ? '#8b5cf6' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.68rem', color: netBank >= 0 ? '#8b5cf6' : '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>
                            🏦 Bank Balance
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: netBank >= 0 ? '#8b5cf6' : '#ef4444' }}>
                            Rs. {netBank.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            In {runningBankIn.toLocaleString()} · Out {runningBankOut.toLocaleString()}
                        </div>
                    </div>

                    {/* Total Running Balance */}
                    <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderLeft: `4px solid ${netTotal >= 0 ? '#10b981' : '#ef4444'}` }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>
                            Total Balance (Cash + Bank)
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: netTotal >= 0 ? '#10b981' : '#ef4444' }}>
                            Rs. {netTotal.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            running reconciled total
                        </div>
                    </div>
                </div>

                {/* ── Margin Highlight Card ── */}
                {marginStats && (
                    <div
                        className="card"
                        style={{
                            padding: '1.15rem 1.4rem',
                            marginBottom: '1.25rem',
                            border: '2px solid rgba(16,185,129,0.35)',
                            background: 'rgba(16,185,129,0.04)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.85rem',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                💰 Workshop Margin — {rangeBounds.label} ({marginStats.jobCount} job{marginStats.jobCount !== 1 ? 's' : ''})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', background: 'var(--color-bg-elevated)', borderRadius: '6px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Labour: </span>
                                    <strong style={{ color: '#10b981' }}>Rs. {Math.round(labourMargin).toLocaleString()}</strong>
                                </div>
                                <div style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', background: 'var(--color-bg-elevated)', borderRadius: '6px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Parts Margin: </span>
                                    <strong style={{ color: '#10b981' }}>Rs. {Math.round(partsMargin).toLocaleString()}</strong>
                                </div>
                                <div style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', background: 'var(--color-bg-elevated)', borderRadius: '6px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Gross: </span>
                                    <strong style={{ color: '#10b981' }}>Rs. {Math.round(totalGrossMargin).toLocaleString()}</strong>
                                </div>
                                <div style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', background: 'rgba(239,68,68,0.06)', borderRadius: '6px' }}>
                                    <span style={{ color: '#ef4444' }}>Expenses: </span>
                                    <strong style={{ color: '#ef4444' }}>− Rs. {Math.round(workshopExpDeduction).toLocaleString()}</strong>
                                </div>
                                <div style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontWeight: 700 }}>Take-Home:</span>
                                    <strong style={{ fontSize: '1.05rem', color: netMargin < 0 ? '#ef4444' : '#10b981' }}>
                                        Rs. {Math.round(Math.abs(netMargin)).toLocaleString()}
                                    </strong>
                                    <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: netMargin < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: netMargin < 0 ? '#ef4444' : '#10b981' }}>
                                        {netMargin < 0 ? 'LOSS' : 'PROFIT'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('margin')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                            <span>🔍 View Margin & Jobs Detail ({allJobs.length}) →</span>
                        </button>
                    </div>
                )}

                {/* ── View Navigation Tabs ── */}
                <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        style={{
                            padding: '0.65rem 1.1rem',
                            border: 'none',
                            borderBottom: activeTab === 'overview' ? '3px solid #10b981' : '3px solid transparent',
                            background: 'transparent',
                            fontWeight: activeTab === 'overview' ? 800 : 500,
                            color: activeTab === 'overview' ? '#10b981' : 'var(--color-text-muted)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        📊 Overview & Cash Drawer
                    </button>

                    <button
                        onClick={() => setActiveTab('expenses')}
                        style={{
                            padding: '0.65rem 1.1rem',
                            border: 'none',
                            borderBottom: activeTab === 'expenses' ? '3px solid #ef4444' : '3px solid transparent',
                            background: 'transparent',
                            fontWeight: activeTab === 'expenses' ? 800 : 500,
                            color: activeTab === 'expenses' ? '#ef4444' : 'var(--color-text-muted)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        💸 Expenses Detail ({expenses.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('margin')}
                        style={{
                            padding: '0.65rem 1.1rem',
                            border: 'none',
                            borderBottom: activeTab === 'margin' ? '3px solid #3b82f6' : '3px solid transparent',
                            background: 'transparent',
                            fontWeight: activeTab === 'margin' ? 800 : 500,
                            color: activeTab === 'margin' ? '#3b82f6' : 'var(--color-text-muted)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        💰 Margin Detail & Jobs ({allJobs.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('transactions')}
                        style={{
                            padding: '0.65rem 1.1rem',
                            border: 'none',
                            borderBottom: activeTab === 'transactions' ? '3px solid #8b5cf6' : '3px solid transparent',
                            background: 'transparent',
                            fontWeight: activeTab === 'transactions' ? 800 : 500,
                            color: activeTab === 'transactions' ? '#8b5cf6' : 'var(--color-text-muted)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        📜 Transaction Feed ({trackerLog.length})
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    TAB 1: OVERVIEW & CASH DRAWER
                   ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'overview' && (
                    <div>
                        {/* ── Transparency: calculation breakdown ── */}
                        <div className="card" style={{ padding: '0.9rem 1.25rem', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => setShowCalculation(v => !v)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>🔍 How is this cash & bank calculated?</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{showCalculation ? '▲ Hide' : '▼ Show'}</span>
                            </button>

                            {showCalculation && (
                                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.06)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '0.35rem' }}>
                                            {rangeBounds.label} — Deposits ({deposits.length} entries)
                                        </div>
                                        <div style={{ fontSize: '0.78rem' }}>
                                            💵 Cash: {sum(deposits.filter(d => !isBank(d))).toLocaleString()} + 🏦 Bank: {sum(deposits.filter(isBank)).toLocaleString()} = <strong>Rs. {totalDeposits.toLocaleString()}</strong>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.06)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.35rem' }}>
                                            {rangeBounds.label} — Expenses ({expenses.length} entries)
                                        </div>
                                        <div style={{ fontSize: '0.78rem' }}>
                                            💵 Cash: {sum(expenses.filter(e => !isBank(e))).toLocaleString()} + 🏦 Bank: {sum(expenses.filter(isBank)).toLocaleString()} = <strong>Rs. {totalExpenses.toLocaleString()}</strong>
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.06)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.35rem' }}>
                                            💵 Cash in Hand = Starting Balance + cash deposits logged since then − cash expenses since then
                                        </div>
                                        <div style={{ fontSize: '0.78rem' }}>
                                            Starting balance (cash): Rs. {baseCash.toLocaleString()}
                                            <br />+ Cash deposits since ({sinceOpeningDeposits.filter(d => !isBank(d)).length} entries): Rs. {sum(sinceOpeningDeposits.filter(d => !isBank(d))).toLocaleString()}
                                            <br />− Cash expenses since ({sinceOpeningExpenses.filter(e => !isBank(e)).length} entries): Rs. {runningCashOut.toLocaleString()}
                                            <br />= <strong style={{ color: netCash < 0 ? '#ef4444' : '#3b82f6' }}>Rs. {netCash.toLocaleString()}</strong>
                                            {(directCashSinceOpening > 0 || creditPaymentsCash > 0) && (
                                                <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                    For reference (not added automatically — log it below if not logged yet): cash bills Rs. {directCashSinceOpening.toLocaleString()}, credit payments received as cash Rs. {creditPaymentsCash.toLocaleString()}.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.06)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.35rem' }}>
                                            🏦 Bank Balance = Starting Balance + auto bank bills + manual bank deposits + credit bank payments − bank expenses
                                        </div>
                                        <div style={{ fontSize: '0.78rem' }}>
                                            Starting balance (bank): Rs. {baseBank.toLocaleString()}
                                            <br />+ Bank bills (auto): Rs. {directBankSinceOpening.toLocaleString()}
                                            <br />+ Extra manual bank deposits: Rs. {sum(sinceOpeningDeposits.filter(isBank)).toLocaleString()}
                                            <br />+ Credit payments received via bank: Rs. {creditPaymentsBank.toLocaleString()}
                                            <br />− Bank expenses since then: Rs. {runningBankOut.toLocaleString()}
                                            <br />= <strong style={{ color: netBank < 0 ? '#ef4444' : '#8b5cf6' }}>Rs. {netBank.toLocaleString()}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Forms and Transaction Feed */}
                        <div className="grid-2" style={{ alignItems: 'start' }}>
                            {/* Quick Add Forms */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* + Add Daily Sale Form */}
                                <div className="card">
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                        + Add Daily Sale (Deposit)
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                                        Log cash receipts into the drawer. Bank entries are for extra bank money not already from a job bill.
                                    </div>
                                    <form onSubmit={handleAddDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="Amount (Rs.)"
                                            required
                                            value={depositForm.amount}
                                            onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                                            min="1"
                                        />
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Note (optional)"
                                            value={depositForm.note}
                                            onChange={e => setDepositForm({ ...depositForm, note: e.target.value })}
                                        />
                                        <select
                                            className="select"
                                            value={depositForm.paymentMode}
                                            onChange={e => setDepositForm({ ...depositForm, paymentMode: e.target.value as PaymentMode })}
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                        </select>
                                        <input
                                            type="date"
                                            className="input"
                                            value={depositForm.date}
                                            onChange={e => setDepositForm({ ...depositForm, date: e.target.value })}
                                        />
                                        <button
                                            type="submit"
                                            disabled={savingDeposit}
                                            style={{ padding: '0.6rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                                        >
                                            {savingDeposit ? 'Saving...' : 'Save Deposit'}
                                        </button>
                                    </form>
                                </div>

                                {/* ⇄ Transfer Cash to Bank */}
                                <div className="card">
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                        ⇄ Transfer Cash → Bank
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                                        Moves money from the drawer into the bank. Reduces Cash in Hand and increases Bank Balance — not counted as a business expense.
                                    </div>
                                    <form onSubmit={handleAddTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="Amount (Rs.)"
                                            required
                                            value={transferForm.amount}
                                            onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                                            min="1"
                                        />
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Note (optional)"
                                            value={transferForm.note}
                                            onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="input"
                                            value={transferForm.date}
                                            onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
                                        />
                                        <button
                                            type="submit"
                                            disabled={savingTransfer}
                                            style={{ padding: '0.6rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                                        >
                                            {savingTransfer ? 'Saving...' : 'Move Cash to Bank'}
                                        </button>
                                    </form>
                                </div>

                                {/* − Add Expense Form */}
                                <div className="card">
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                                        − Add Expense
                                    </div>
                                    <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="Amount (Rs.)"
                                            required
                                            value={expenseForm.amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            min="1"
                                        />
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Description (e.g. Oil purchased, tools, tea)"
                                            required
                                            value={expenseForm.description}
                                            onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                        />
                                        <select
                                            className="select"
                                            value={expenseForm.paymentMode}
                                            onChange={e => setExpenseForm({ ...expenseForm, paymentMode: e.target.value as PaymentMode })}
                                        >
                                            <option value="CASH">Paid by Cash</option>
                                            <option value="BANK_TRANSFER">Paid by Bank Transfer</option>
                                        </select>
                                        <input
                                            type="date"
                                            className="input"
                                            value={expenseForm.date}
                                            onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                        />
                                        <button
                                            type="submit"
                                            disabled={savingExpense}
                                            style={{ padding: '0.6rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                                        >
                                            {savingExpense ? 'Saving...' : 'Save Expense'}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Feed */}
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                        {rangeBounds.label} — Recent Feed
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {trackerLog.length} item{trackerLog.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {trackerLog.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                        No deposits or expenses in this period
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '520px', overflowY: 'auto' }}>
                                        {trackerLog.map(entry => (
                                            <div
                                                key={entry.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.6rem 0.85rem',
                                                    background: entry.type === 'deposit' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                                                    border: `1px solid ${entry.type === 'deposit' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                    borderRadius: '8px',
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{entry.label}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                        {new Date(entry.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                                        {' · '}
                                                        {entry.type === 'deposit' ? 'Sale Deposit' : 'Expense'}
                                                        {' · '}
                                                        {entry.bank ? '🏦 Bank' : '💵 Cash'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: entry.type === 'deposit' ? '#10b981' : '#ef4444' }}>
                                                        {entry.type === 'deposit' ? '+' : '−'} Rs. {entry.amount.toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={() => entry.type === 'deposit' ? handleDeleteDeposit(entry.id) : handleDeleteExpense(entry.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px' }}
                                                        title="Delete entry"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TAB 2: EXPENSES DETAIL VIEW
                   ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'expenses' && (
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                    💸 Workshop Expenses Detail
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
                                    {rangeBounds.label} · Total: <strong style={{ color: '#ef4444' }}>Rs. {totalExpenses.toLocaleString()}</strong> ({expenses.length} entries)
                                </p>
                            </div>

                            <button
                                onClick={exportExpensesToExcel}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                                📥 Export to Excel
                            </button>
                        </div>

                        {/* Expense Summary Chips */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.06)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Total Expenses</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>Rs. {totalExpenses.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{expenses.length} entries</div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>💵 Paid from Drawer (Cash)</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3b82f6' }}>Rs. {cashOut.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{expenses.filter(e => !isBank(e)).length} entries</div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(139,92,246,0.06)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 700 }}>🏦 Paid via Bank Transfer</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8b5cf6' }}>Rs. {bankOut.toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{expenses.filter(isBank).length} entries</div>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="🔍 Search expenses..."
                                style={{ maxWidth: '300px', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                                value={expenseSearch}
                                onChange={e => setExpenseSearch(e.target.value)}
                            />

                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Mode:</span>
                                {(['ALL', 'CASH', 'BANK_TRANSFER'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setExpenseModeFilter(mode)}
                                        className={expenseModeFilter === mode ? 'btn btn-primary' : 'btn btn-secondary'}
                                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                                    >
                                        {mode === 'ALL' ? 'All' : mode === 'CASH' ? '💵 Cash' : '🏦 Bank'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table of Expenses */}
                        {filteredExpenses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {expenses.length === 0 ? 'No expenses recorded for this period' : 'No expenses match your search'}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', background: 'var(--color-bg-elevated)' }}>
                                            <th style={{ padding: '0.6rem 0.75rem', width: '50px' }}>#</th>
                                            <th style={{ padding: '0.6rem 0.75rem' }}>Date</th>
                                            <th style={{ padding: '0.6rem 0.75rem' }}>Description</th>
                                            <th style={{ padding: '0.6rem 0.75rem' }}>Payment Mode</th>
                                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Amount</th>
                                            <th style={{ padding: '0.6rem 0.75rem', width: '60px', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredExpenses.map((e, idx) => (
                                            <tr key={e._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                                <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                    {new Date(e.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{e.description}</td>
                                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                                    <span
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            fontWeight: 700,
                                                            background: isBank(e) ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)',
                                                            color: isBank(e) ? '#8b5cf6' : '#3b82f6',
                                                        }}
                                                    >
                                                        {isBank(e) ? '🏦 Bank Transfer' : '💵 Cash Drawer'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>
                                                    Rs. {e.amount.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleDeleteExpense(e._id)}
                                                        style={{
                                                            background: 'rgba(239,68,68,0.1)',
                                                            color: '#ef4444',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            padding: '3px 8px',
                                                            fontSize: '0.75rem',
                                                        }}
                                                        title="Delete expense"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 800, background: 'var(--color-bg-elevated)' }}>
                                            <td colSpan={4} style={{ padding: '0.75rem' }}>
                                                Total ({filteredExpenses.length} entries)
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444', fontSize: '1rem' }}>
                                                Rs. {sum(filteredExpenses).toLocaleString()}
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TAB 3: MARGIN DETAIL & JOBS VIEW
                   ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'margin' && (
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                    💰 Workshop Margin & Jobs Detail
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
                                    {rangeBounds.label} · Total Jobs: <strong>{marginStats?.jobCount || 0}</strong>
                                </p>
                            </div>

                            <button
                                onClick={exportMarginJobsToExcel}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                                📥 Export to Excel
                            </button>
                        </div>

                        {/* Margin KPI Breakdown Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-elevated)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Billed Revenue</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>Rs. {Math.round(marginStats?.totalRevenue || 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Avg: Rs. {Math.round(marginStats?.avgTicket || 0).toLocaleString()} / job</div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Labour Charges Margin</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>Rs. {Math.round(labourMargin).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>100% service fee profit</div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>Spare Parts Margin</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3b82f6' }}>Rs. {Math.round(partsMargin).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>customer price − shop cost</div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.06)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Workshop Expenses</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>− Rs. {Math.round(workshopExpDeduction).toLocaleString()}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>deducted from gross</div>
                            </div>

                            <div style={{ padding: '0.85rem 1rem', background: netMargin >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '10px', border: `1.5px solid ${netMargin >= 0 ? '#10b981' : '#ef4444'}` }}>
                                <div style={{ fontSize: '0.7rem', color: netMargin >= 0 ? '#10b981' : '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Take-Home Net Profit</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: netMargin >= 0 ? '#10b981' : '#ef4444' }}>
                                    Rs. {Math.round(Math.abs(netMargin)).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: netMargin >= 0 ? '#10b981' : '#ef4444' }}>
                                    {netMargin >= 0 ? '✅ NET PROFIT' : '⚠️ NET LOSS'}
                                </div>
                            </div>
                        </div>

                        {/* Breakdown by Service Type & Mechanic */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
                            {/* Service Type Breakdown */}
                            <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-elevated)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    🔧 Margin by Service Type
                                </div>
                                {marginStats?.byServiceType && Object.keys(marginStats.byServiceType).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {Object.entries(marginStats.byServiceType).map(([type, data]) => (
                                            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.3rem 0.5rem', background: 'var(--color-bg-card)', borderRadius: '6px' }}>
                                                <span>{type} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>({data.count})</span></span>
                                                <strong style={{ color: '#10b981' }}>Rs. {Math.round(data.margin).toLocaleString()}</strong>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No service types in this range</div>
                                )}
                            </div>

                            {/* Mechanic Breakdown */}
                            <div style={{ padding: '0.85rem 1rem', background: 'var(--color-bg-elevated)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    👨‍🔧 Margin by Mechanic
                                </div>
                                {marginStats?.byMechanic && Object.keys(marginStats.byMechanic).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {Object.entries(marginStats.byMechanic).map(([mech, data]) => (
                                            <div key={mech} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.3rem 0.5rem', background: 'var(--color-bg-card)', borderRadius: '6px' }}>
                                                <span>{mech} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>({data.count})</span></span>
                                                <strong style={{ color: '#3b82f6' }}>Rs. {Math.round(data.margin).toLocaleString()}</strong>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No mechanic records in this range</div>
                                )}
                            </div>
                        </div>

                        {/* Search and Filters for Jobs */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                className="input"
                                placeholder="🔍 Search customer, bike #, mechanic, service..."
                                style={{ maxWidth: '340px', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                                value={jobSearch}
                                onChange={e => setJobSearch(e.target.value)}
                            />

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {mechanicsList.length > 0 && (
                                    <select
                                        className="select"
                                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                                        value={jobMechanicFilter}
                                        onChange={e => setJobMechanicFilter(e.target.value)}
                                    >
                                        <option value="ALL">All Mechanics</option>
                                        {mechanicsList.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                )}

                                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                    {(['ALL', 'CASH', 'BANK_TRANSFER', 'CREDIT'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setJobModeFilter(mode)}
                                            className={jobModeFilter === mode ? 'btn btn-primary' : 'btn btn-secondary'}
                                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                                        >
                                            {mode === 'ALL' ? 'All' : mode === 'CASH' ? 'Cash' : mode === 'BANK_TRANSFER' ? 'Bank' : 'Credit'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Itemized Jobs Table */}
                        {filteredJobs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                {allJobs.length === 0 ? 'No service jobs recorded in this period' : 'No jobs match your search filter'}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', background: 'var(--color-bg-elevated)' }}>
                                            <th style={{ padding: '0.6rem 0.65rem', width: '40px' }}>#</th>
                                            <th style={{ padding: '0.6rem 0.65rem' }}>Date</th>
                                            <th style={{ padding: '0.6rem 0.65rem' }}>Customer</th>
                                            <th style={{ padding: '0.6rem 0.65rem' }}>Bike #</th>
                                            <th style={{ padding: '0.6rem 0.65rem' }}>Service / Mechanic</th>
                                            <th style={{ padding: '0.6rem 0.65rem' }}>Mode</th>
                                            <th style={{ padding: '0.6rem 0.65rem', textAlign: 'right' }}>Labour</th>
                                            <th style={{ padding: '0.6rem 0.65rem', textAlign: 'right' }}>Parts Margin</th>
                                            <th style={{ padding: '0.6rem 0.65rem', textAlign: 'right' }}>Bill Total</th>
                                            <th style={{ padding: '0.6rem 0.65rem', textAlign: 'right' }}>Margin Earned</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredJobs.map((j, idx) => (
                                            <tr key={j._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '0.6rem 0.65rem', color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                                                <td style={{ padding: '0.6rem 0.65rem', whiteSpace: 'nowrap' }}>
                                                    {new Date(j.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.65rem', fontWeight: 600 }}>{j.customerName}</td>
                                                <td style={{ padding: '0.6rem 0.65rem', color: 'var(--color-text-muted)' }}>{j.bikeNumber || '—'}</td>
                                                <td style={{ padding: '0.6rem 0.65rem' }}>
                                                    <div>{j.serviceType}</div>
                                                    {j.mechanicName && j.mechanicName !== '—' && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>👨‍🔧 {j.mechanicName}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.65rem' }}>
                                                    <span
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontWeight: 700,
                                                            background:
                                                                j.paymentMode === 'CASH'
                                                                    ? 'rgba(16,185,129,0.12)'
                                                                    : j.paymentMode === 'BANK_TRANSFER'
                                                                    ? 'rgba(139,92,246,0.12)'
                                                                    : 'rgba(239,68,68,0.12)',
                                                            color:
                                                                j.paymentMode === 'CASH'
                                                                    ? '#10b981'
                                                                    : j.paymentMode === 'BANK_TRANSFER'
                                                                    ? '#8b5cf6'
                                                                    : '#ef4444',
                                                        }}
                                                    >
                                                        {j.paymentMode || 'CASH'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                                                    Rs. {j.serviceCharges.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                                                    Rs. {j.partsMargin.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', fontWeight: 600 }}>
                                                    Rs. {j.totalAmount.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                                                    Rs. {j.margin.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 800, background: 'var(--color-bg-elevated)' }}>
                                            <td colSpan={6} style={{ padding: '0.75rem' }}>
                                                Total ({filteredJobs.length} jobs)
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>
                                                Rs. {filteredJobs.reduce((s, j) => s + j.serviceCharges, 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#3b82f6' }}>
                                                Rs. {filteredJobs.reduce((s, j) => s + j.partsMargin, 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                Rs. {filteredJobs.reduce((s, j) => s + j.totalAmount, 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontSize: '0.95rem' }}>
                                                Rs. {filteredJobs.reduce((s, j) => s + j.margin, 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TAB 4: TRANSACTION FEED
                   ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'transactions' && (
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                                📜 Full Transaction Ledger ({trackerLog.length})
                            </h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {rangeBounds.label}
                            </span>
                        </div>

                        {trackerLog.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                No transactions in this period
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                {trackerLog.map(entry => (
                                    <div
                                        key={entry.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            background: entry.type === 'deposit' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                                            border: `1px solid ${entry.type === 'deposit' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{entry.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                {new Date(entry.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {' · '}
                                                {entry.type === 'deposit' ? 'Deposit (Daily Sale)' : 'Expense'}
                                                {' · '}
                                                {entry.bank ? '🏦 Bank Transfer' : '💵 Cash Drawer'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontWeight: 800, fontSize: '1rem', color: entry.type === 'deposit' ? '#10b981' : '#ef4444' }}>
                                                {entry.type === 'deposit' ? '+' : '−'} Rs. {entry.amount.toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => entry.type === 'deposit' ? handleDeleteDeposit(entry.id) : handleDeleteExpense(entry.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
                                                title="Delete"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
