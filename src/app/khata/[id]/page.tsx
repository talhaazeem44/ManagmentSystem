'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Loader from '@/components/Loader';
import { HONDA_BIKE_MODELS, getKhataMargin } from '@/lib/constants';

interface KhataItem {
    model: string;
    quantity: number;
    pricePerUnit: number;
    standardPrice: number;
    baseMargin: number;
    totalMargin: number;
    bikeId?: string;
    engineNumber?: string;
    chassisNumber?: string;
}

interface AvailableBike {
    id: string;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
}

interface KhataTransaction {
    _id: string;
    date: string;
    type: 'STOCK_GIVEN' | 'PAYMENT';
    description: string;
    amount: number;
    margin?: number;
    items?: KhataItem[];
    paymentMode?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
    note?: string;
}

interface KhataParty {
    _id: string;
    name: string;
    mobile?: string;
    address?: string;
    notes?: string;
    transactions: KhataTransaction[];
    totalDebit: number;
    totalCredit: number;
    balance: number;
}

interface BikeRow {
    key: string;
    model: string;
    quantity: string;
    pricePerUnit: string;
    bikeId?: string;
    engineNumber?: string;
    chassisNumber?: string;
    bikeSearch: string;
}

const emptyPaymentForm = { amount: '', paymentMode: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CREDIT', note: '', date: '' };
const newBikeRow = (): BikeRow => ({ key: Math.random().toString(36).slice(2), model: '', quantity: '1', pricePerUnit: '', bikeSearch: '' });

interface ComputedRow { stdPrice: number; baseMargin: number; marginPerBike: number; rowTotal: number; rowMargin: number }

function BikeRowsTable({ rows, setRows, computeRow, availableBikes }: {
    rows: BikeRow[];
    setRows: React.Dispatch<React.SetStateAction<BikeRow[]>>;
    computeRow: (row: BikeRow) => ComputedRow;
    availableBikes: AvailableBike[];
}) {
    // The table wrapper below needs overflow-x:auto for small screens, which per the CSS spec forces
    // overflow-y to clip too — that silently hides a position:absolute suggestion dropdown nested inside
    // it. Rendering the dropdown through a portal straight into document.body sidesteps that entirely:
    // it's no longer a descendant of the clipping container, and using document-relative coordinates
    // (rect + scroll offset) with position:absolute means it scrolls naturally with the page — no scroll
    // listeners or manual re-sync needed, unlike a position:fixed version anchored to viewport coordinates.
    const [dropdownRect, setDropdownRect] = useState<Record<string, { top: number; left: number; width: number }>>({});

    const updateField = (key: string, field: keyof BikeRow, value: string, el?: HTMLInputElement) => {
        setRows(rs => rs.map(r => r.key === key ? { ...r, [field]: value } : r));
        if (el) {
            const rect = el.getBoundingClientRect();
            setDropdownRect(d => ({ ...d, [key]: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width } }));
        }
    };

    const selectBike = (key: string, bike: AvailableBike) =>
        setRows(rs => rs.map(r => r.key === key ? {
            ...r, bikeId: bike.id, engineNumber: bike.engineNumber, chassisNumber: bike.chassisNumber,
            model: bike.model, quantity: '1', bikeSearch: '',
        } : r));

    const clearBike = (key: string) =>
        setRows(rs => rs.map(r => r.key === key ? { ...r, bikeId: undefined, engineNumber: undefined, chassisNumber: undefined } : r));

    const removeRow = (key: string) => setRows(rs => rs.filter(r => r.key !== key));

    return (
        <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
                        {['Model', 'Bike (Engine/Chassis)', 'Qty', 'Price / Bike (PKR)', 'Std Price', 'Margin / Bike', 'Row Total', ''].map(h => (
                            <th key={h} style={{ padding: '7px 8px', textAlign: (h === 'Model' || h === 'Bike (Engine/Chassis)' || h === '') ? 'left' : 'right', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => {
                        const c = computeRow(row);
                        const searchQuery = row.bikeSearch.trim().toLowerCase();
                        // Model is a hint, not a hard filter — a mismatched model string (casing, spacing)
                        // on an older inventory record would otherwise silently hide an otherwise-correct match.
                        const matches = searchQuery
                            ? availableBikes.filter(b =>
                                b.engineNumber?.toLowerCase().includes(searchQuery) || b.chassisNumber?.toLowerCase().includes(searchQuery)
                            ).slice(0, 8)
                            : [];
                        const rect = dropdownRect[row.key];
                        return (
                            <tr key={row.key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '6px 8px', minWidth: '130px' }}>
                                    <select className="select" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                                        value={row.model} disabled={!!row.bikeId}
                                        onChange={e => updateField(row.key, 'model', e.target.value)}>
                                        <option value="">Select model</option>
                                        {HONDA_BIKE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </td>
                                <td style={{ padding: '6px 8px', minWidth: '170px', maxWidth: '210px', position: 'relative' }}>
                                    {row.bikeId ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', padding: '0.3rem 0.5rem', maxWidth: '100%' }}>
                                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${row.engineNumber} / ${row.chassisNumber}`}>
                                                {row.engineNumber} / {row.chassisNumber}
                                            </span>
                                            <button type="button" onClick={() => clearBike(row.key)} style={{ flexShrink: 0, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                                        </div>
                                    ) : (
                                        <>
                                            <input type="text" className="input" placeholder="Search engine/chassis..."
                                                style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem', width: '150px' }}
                                                value={row.bikeSearch}
                                                onChange={e => updateField(row.key, 'bikeSearch', e.target.value, e.target)}
                                                onFocus={e => updateField(row.key, 'bikeSearch', row.bikeSearch, e.target)} />
                                            {searchQuery && rect && typeof document !== 'undefined' && createPortal(
                                                <div style={{
                                                    position: 'absolute', top: rect.top + 2, left: rect.left,
                                                    zIndex: 1000, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                                    borderRadius: '6px', width: rect.width,
                                                    maxHeight: '220px', overflowY: 'auto', overflowX: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                                }}>
                                                    {matches.length > 0 ? matches.map(b => (
                                                        <div key={b.id} onClick={() => selectBike(row.key, b)}
                                                            style={{ padding: '0.35rem 0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                                                            <div style={{ fontSize: '0.72rem', fontWeight: 600, wordBreak: 'break-all' }}>{b.engineNumber} / {b.chassisNumber}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{b.model} · {b.color}</div>
                                                        </div>
                                                    )) : (
                                                        <div style={{ padding: '0.5rem 0.5rem', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                                            No match for &quot;{row.bikeSearch}&quot;
                                                        </div>
                                                    )}
                                                </div>,
                                                document.body
                                            )}
                                        </>
                                    )}
                                </td>
                                <td style={{ padding: '6px 8px', minWidth: '70px' }}>
                                    <input type="number" min="1" className="input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', width: '60px', textAlign: 'right' }}
                                        value={row.quantity} disabled={!!row.bikeId}
                                        onChange={e => updateField(row.key, 'quantity', e.target.value)} />
                                </td>
                                <td style={{ padding: '6px 8px', minWidth: '130px' }}>
                                    <input type="text" inputMode="decimal" className="input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', width: '110px', textAlign: 'right' }}
                                        placeholder={row.model ? String(getKhataMargin(row.model, 0).referencePrice || '') : '0'}
                                        value={row.pricePerUnit}
                                        onChange={e => updateField(row.key, 'pricePerUnit', e.target.value)} />
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                    {row.model ? `Rs. ${c.stdPrice.toLocaleString()}` : '—'}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: c.marginPerBike >= 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                                    {row.model && row.pricePerUnit ? `Rs. ${c.marginPerBike.toLocaleString()}` : '—'}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {row.model && row.pricePerUnit && row.quantity ? `Rs. ${c.rowTotal.toLocaleString()}` : '—'}
                                </td>
                                <td style={{ padding: '6px 8px' }}>
                                    {rows.length > 1 && (
                                        <button onClick={() => removeRow(row.key)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem' }}>✕</button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function KhataDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { toasts, showToast, removeToast } = useToast();
    const [party, setParty] = useState<KhataParty | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeForm, setActiveForm] = useState<'STOCK' | 'PAYMENT' | null>(null);
    const [bikeRows, setBikeRows] = useState<BikeRow[]>([newBikeRow()]);
    const [stockDate, setStockDate] = useState('');
    const [stockNote, setStockNote] = useState('');
    const [otherAmount, setOtherAmount] = useState('');
    const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteTx, setConfirmDeleteTx] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
    const [editingTx, setEditingTx] = useState<KhataTransaction | null>(null);
    const [editBikeRows, setEditBikeRows] = useState<BikeRow[]>([newBikeRow()]);
    const [editOtherAmount, setEditOtherAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editNote, setEditNote] = useState('');
    const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', paymentMode: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CREDIT', note: '', date: '' });
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [availableBikes, setAvailableBikes] = useState<AvailableBike[]>([]);

    const fetchAvailableBikes = async () => {
        try {
            const res = await fetch('/api/bikes');
            if (res.ok) {
                const data = await res.json();
                setAvailableBikes(
                    data
                        .filter((b: any) => b.status === 'AVAILABLE')
                        .map((b: any) => ({ id: b.id || b._id, model: b.model, color: b.color, engineNumber: b.engineNumber, chassisNumber: b.chassisNumber }))
                );
            }
        } catch { /* ignore */ }
    };

    const fetchParty = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/khata/${id}`);
            if (res.ok) setParty(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchParty(); fetchAvailableBikes(); }, [id]);

    // Compute derived values for each bike row
    const computeRow = (row: BikeRow) => {
        const qty = Number(row.quantity) || 0;
        const price = Number(row.pricePerUnit) || 0;
        const { referencePrice: stdPrice, baseMargin, margin: marginPerBike } = getKhataMargin(row.model, price);
        return {
            stdPrice,
            baseMargin,
            marginPerBike,
            rowTotal: qty * price,
            rowMargin: qty * marginPerBike,
        };
    };

    const isRowComplete = (r: BikeRow) => !!r.model && Number(r.quantity) > 0 && Number(r.pricePerUnit) > 0;
    const bikesTotal = bikeRows.filter(isRowComplete).reduce((s, r) => s + computeRow(r).rowTotal, 0);
    const totalAmount = bikesTotal + (Number(otherAmount) || 0);
    const totalMargin = bikeRows.filter(isRowComplete).reduce((s, r) => s + computeRow(r).rowMargin, 0);
    const stockFormValid = bikeRows.some(isRowComplete);

    const handleAddStock = async () => {
        setSubmitting(true);
        try {
            const items = bikeRows
                .filter(r => r.model && Number(r.quantity) > 0 && Number(r.pricePerUnit) > 0)
                .map(r => ({
                    model: r.model, quantity: Number(r.quantity), pricePerUnit: Number(r.pricePerUnit),
                    bikeId: r.bikeId, engineNumber: r.engineNumber, chassisNumber: r.chassisNumber,
                }));

            const res = await fetch(`/api/khata/${id}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'STOCK_GIVEN', items, otherAmount: Number(otherAmount) || 0, date: stockDate || undefined, note: stockNote }),
            });
            if (res.ok) {
                showToast('Stock entry added', 'success');
                setBikeRows([newBikeRow()]);
                setStockDate('');
                setStockNote('');
                setOtherAmount('');
                setActiveForm(null);
                fetchParty();
                fetchAvailableBikes();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddPayment = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/khata/${id}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'PAYMENT',
                    description: 'Payment received',
                    amount: Number(paymentForm.amount),
                    paymentMode: paymentForm.paymentMode,
                    note: paymentForm.note,
                    date: paymentForm.date || undefined,
                }),
            });
            if (res.ok) {
                showToast('Payment recorded', 'success');
                setPaymentForm(emptyPaymentForm);
                setActiveForm(null);
                fetchParty();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTx = async (txId: string) => {
        const res = await fetch(`/api/khata/${id}/transactions/${txId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Entry deleted', 'success');
            setConfirmDeleteTx(null);
            fetchParty();
            fetchAvailableBikes();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.message || 'Delete failed', 'error');
            setConfirmDeleteTx(null);
        }
    };

    const handleEditInit = (tx: KhataTransaction) => {
        setActiveForm(null);
        setEditingTx(tx);
        if (tx.type === 'PAYMENT') {
            const d = new Date(tx.date);
            setEditPaymentForm({
                amount: String(tx.amount),
                paymentMode: tx.paymentMode || 'CASH',
                note: tx.note || '',
                date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            });
        } else {
            const rows: BikeRow[] = (tx.items && tx.items.length > 0)
                ? tx.items.map(item => ({
                    key: Math.random().toString(36).slice(2),
                    model: item.model,
                    quantity: String(item.quantity),
                    pricePerUnit: String(item.pricePerUnit),
                    bikeId: item.bikeId,
                    engineNumber: item.engineNumber,
                    chassisNumber: item.chassisNumber,
                    bikeSearch: '',
                }))
                : [newBikeRow()];
            setEditBikeRows(rows);
            setEditOtherAmount('');
            const d = new Date(tx.date);
            setEditDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            setEditNote(tx.note || '');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingTx) return;
        setEditSubmitting(true);
        try {
            let body: any;
            if (editingTx.type === 'PAYMENT') {
                body = { type: 'PAYMENT', amount: Number(editPaymentForm.amount), paymentMode: editPaymentForm.paymentMode, note: editPaymentForm.note, date: editPaymentForm.date || undefined };
            } else {
                const items = editBikeRows
                    .filter(r => r.model && Number(r.quantity) > 0 && Number(r.pricePerUnit) > 0)
                    .map(r => ({
                        model: r.model, quantity: Number(r.quantity), pricePerUnit: Number(r.pricePerUnit),
                        bikeId: r.bikeId, engineNumber: r.engineNumber, chassisNumber: r.chassisNumber,
                    }));
                body = { type: 'STOCK_GIVEN', items, otherAmount: Number(editOtherAmount) || 0, date: editDate || undefined, note: editNote };
            }
            const res = await fetch(`/api/khata/${id}/transactions/${editingTx._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                showToast('Entry updated', 'success');
                setEditingTx(null);
                fetchParty();
                fetchAvailableBikes();
            } else {
                const err = await res.json();
                showToast(err.message || 'Failed to update', 'error');
            }
        } finally {
            setEditSubmitting(false);
        }
    };

    const editBikesTotal = editBikeRows.filter(isRowComplete).reduce((s, r) => s + computeRow(r).rowTotal, 0);
    const editTotalAmount = editBikesTotal + (Number(editOtherAmount) || 0);
    const editTotalMargin = editBikeRows.filter(isRowComplete).reduce((s, r) => s + computeRow(r).rowMargin, 0);
    const editStockValid = editBikeRows.some(isRowComplete);

    const allMonths = Array.from(new Set(
        (party?.transactions || []).map(t => {
            const d = new Date(t.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })
    )).sort().reverse();

    const filteredTxs = (party?.transactions || [])
        .filter(t => {
            if (selectedMonth === 'ALL') return true;
            const d = new Date(t.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const runningRows = (() => {
        let balance = 0;
        if (selectedMonth !== 'ALL') {
            const [y, m] = selectedMonth.split('-').map(Number);
            const monthStart = new Date(y, m - 1, 1);
            balance = (party?.transactions || [])
                .filter(t => new Date(t.date) < monthStart)
                .reduce((s, t) => t.type === 'STOCK_GIVEN' ? s + t.amount : s - t.amount, 0);
        }
        return filteredTxs.map(t => {
            if (t.type === 'STOCK_GIVEN') balance += t.amount;
            else balance -= t.amount;
            return { ...t, runningBalance: balance };
        });
    })();

    const filteredDebit = filteredTxs.filter(t => t.type === 'STOCK_GIVEN').reduce((s, t) => s + t.amount, 0);
    const filteredCredit = filteredTxs.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
    const filteredMargin = filteredTxs.filter(t => t.type === 'STOCK_GIVEN').reduce((s, t) => s + (t.margin || 0), 0);

    const monthLabel = (m: string) => {
        const [y, mo] = m.split('-');
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
    };

    const totalKhataMargin = (party?.transactions || [])
        .filter(t => t.type === 'STOCK_GIVEN')
        .reduce((s, t) => s + (t.margin || 0), 0);

    // Dealer-facing statement — deliberately excludes margin, only stock given / paid / remaining.
    const exportStatement = async () => {
        if (!party) return;
        const XLSX = await import('xlsx');

        const rows: (string | number)[][] = [
            [`${party.name} — Account Statement`],
            ...(party.mobile ? [[`Mobile: ${party.mobile}`]] : []),
            [`Generated: ${new Date().toLocaleString('en-PK')}`],
            [`Period: ${selectedMonth === 'ALL' ? 'All Time' : monthLabel(selectedMonth)}`],
            [],
            ['Date', 'Details', 'Stock Given (Rs.)', 'Paid (Rs.)', 'Balance (Rs.)'],
            ...runningRows.map(t => [
                new Date(t.date).toLocaleDateString('en-PK'),
                t.description,
                t.type === 'STOCK_GIVEN' ? t.amount : '',
                t.type === 'PAYMENT' ? t.amount : '',
                t.runningBalance,
            ]),
            [],
            ['Total Stock Given', '', filteredDebit],
            ['Total Paid', '', '', filteredCredit],
            ['Remaining / Outstanding Amount', '', '', '', party.balance],
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 14 }, { wch: 38 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Statement');
        XLSX.writeFile(wb, `${party.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-statement.xlsx`);
    };

    if (loading) return <DashboardLayout><Loader size={160} text="Loading khata..." fullPage /></DashboardLayout>;
    if (!party) return <DashboardLayout><div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Party not found.</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <a href="/khata" style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>← Khata</a>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.25rem' }}>{party.name}</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {party.mobile && <span>📞 {party.mobile}</span>}
                            {party.address && <span>📍 {party.address}</span>}
                        </p>
                        {party.notes && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.2rem' }}>{party.notes}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={exportStatement}>
                            📤 Export Statement
                        </button>
                        <button className={`btn ${activeForm === 'STOCK' ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => setActiveForm(activeForm === 'STOCK' ? null : 'STOCK')}>
                            {activeForm === 'STOCK' ? 'Cancel' : '📦 Stock Given'}
                        </button>
                        <button className={`btn ${activeForm === 'PAYMENT' ? 'btn-secondary' : 'btn-success'}`}
                            onClick={() => setActiveForm(activeForm === 'PAYMENT' ? null : 'PAYMENT')}>
                            {activeForm === 'PAYMENT' ? 'Cancel' : '💰 Record Payment'}
                        </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>Total Stock Given</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>Rs. {party.totalDebit.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>Total Paid</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>Rs. {party.totalCredit.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: `4px solid ${party.balance > 0 ? '#f59e0b' : '#10b981'}` }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>Outstanding</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: party.balance > 0 ? '#f59e0b' : '#10b981' }}>Rs. {party.balance.toLocaleString()}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{party.balance > 0 ? 'amount due' : 'settled'}</div>
                    </div>
                    <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid #8b5cf6' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.3rem' }}>Total Margin Earned</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>Rs. {totalKhataMargin.toLocaleString()}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>added to profit</div>
                    </div>
                </div>

                {/* ── Stock Given form ── */}
                {activeForm === 'STOCK' && (
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>📦 Add Stock Given</h3>

                        {/* Bike rows table */}
                        <BikeRowsTable rows={bikeRows} setRows={setBikeRows} computeRow={computeRow} availableBikes={availableBikes} />

                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', marginBottom: '1rem' }}
                            onClick={() => setBikeRows(r => [...r, newBikeRow()])}>
                            + Add Bike
                        </button>

                        {/* Other Amount */}
                        <div className="form-group" style={{ marginBottom: '1rem', maxWidth: '280px' }}>
                            <label className="label">Other Amount (PKR) <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— added to total, not to margin</span></label>
                            <input type="text" inputMode="decimal" className="input" value={otherAmount}
                                onChange={e => setOtherAmount(e.target.value)} placeholder="e.g. transport, delivery charges" />
                        </div>

                        {/* Totals summary */}
                        {stockFormValid && (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                <span style={{ fontSize: '0.85rem' }}>Bikes: <strong>Rs. {bikesTotal.toLocaleString()}</strong></span>
                                {(Number(otherAmount) || 0) > 0 && <span style={{ fontSize: '0.85rem' }}>Other: <strong>Rs. {(Number(otherAmount)).toLocaleString()}</strong></span>}
                                <span style={{ fontSize: '0.85rem' }}>Total Amount: <strong style={{ color: 'var(--color-primary)' }}>Rs. {totalAmount.toLocaleString()}</strong></span>
                                <span style={{ fontSize: '0.85rem' }}>Margin: <strong style={{ color: totalMargin >= 0 ? '#10b981' : '#ef4444' }}>Rs. {totalMargin.toLocaleString()}</strong></span>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="label">Date</label>
                                <input type="date" className="input" value={stockDate} onChange={e => setStockDate(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                                <label className="label">Note</label>
                                <input className="input" value={stockNote} onChange={e => setStockNote(e.target.value)} placeholder="Optional note..." />
                            </div>
                        </div>

                        <button className="btn btn-primary" disabled={submitting || !stockFormValid} onClick={handleAddStock}>
                            {submitting ? 'Saving...' : '✅ Save Stock Entry'}
                        </button>
                    </div>
                )}

                {/* ── Payment form ── */}
                {activeForm === 'PAYMENT' && (
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>💰 Record Payment</h3>
                        <div className="grid-2" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="label">Amount (PKR) *</label>
                                <input type="text" inputMode="decimal" className="input" value={paymentForm.amount}
                                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="50000" />
                            </div>
                            <div className="form-group">
                                <label className="label">Payment Mode *</label>
                                <select className="select" value={paymentForm.paymentMode}
                                    onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value as any })}>
                                    <option value="CASH">Cash</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CREDIT">Credit (still owed)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Date</label>
                                <input type="date" className="input" value={paymentForm.date}
                                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="label">Note</label>
                                <input className="input" value={paymentForm.note}
                                    onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Reference / note..." />
                            </div>
                        </div>
                        <button className="btn btn-success" disabled={submitting || !paymentForm.amount} onClick={handleAddPayment}>
                            {submitting ? 'Saving...' : '✅ Record Payment'}
                        </button>
                    </div>
                )}

                {/* Month filter */}
                {allMonths.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <button onClick={() => setSelectedMonth('ALL')} className={`btn ${selectedMonth === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}>All Time</button>
                        {allMonths.map(m => (
                            <button key={m} onClick={() => setSelectedMonth(m)} className={`btn ${selectedMonth === m ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}>
                                {monthLabel(m)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Month summary chips */}
                {selectedMonth !== 'ALL' && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ padding: '0.5rem 0.9rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '0.82rem' }}>
                            Given: <strong style={{ color: '#ef4444' }}>Rs. {filteredDebit.toLocaleString()}</strong>
                        </div>
                        <div style={{ padding: '0.5rem 0.9rem', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '0.82rem' }}>
                            Paid: <strong style={{ color: '#10b981' }}>Rs. {filteredCredit.toLocaleString()}</strong>
                        </div>
                        {filteredMargin !== 0 && (
                            <div style={{ padding: '0.5rem 0.9rem', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', fontSize: '0.82rem' }}>
                                Margin: <strong style={{ color: '#8b5cf6' }}>Rs. {filteredMargin.toLocaleString()}</strong>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Edit form ── */}
                {editingTx && (
                    <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                                ✏️ Edit {editingTx.type === 'PAYMENT' ? 'Payment' : 'Stock Entry'}
                            </h3>
                            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => setEditingTx(null)}>Cancel</button>
                        </div>

                        {editingTx.type === 'PAYMENT' ? (
                            <div className="grid-2" style={{ marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="label">Amount (PKR) *</label>
                                    <input type="text" inputMode="decimal" className="input" value={editPaymentForm.amount}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })} placeholder="50000" />
                                </div>
                                <div className="form-group">
                                    <label className="label">Payment Mode *</label>
                                    <select className="select" value={editPaymentForm.paymentMode}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, paymentMode: e.target.value as any })}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CREDIT">Credit (still owed)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Date</label>
                                    <input type="date" className="input" value={editPaymentForm.date}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Note</label>
                                    <input className="input" value={editPaymentForm.note}
                                        onChange={e => setEditPaymentForm({ ...editPaymentForm, note: e.target.value })} placeholder="Reference / note..." />
                                </div>
                            </div>
                        ) : (
                            <>
                                <BikeRowsTable rows={editBikeRows} setRows={setEditBikeRows} computeRow={computeRow} availableBikes={availableBikes} />
                                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', marginBottom: '1rem' }}
                                    onClick={() => setEditBikeRows(r => [...r, newBikeRow()])}>+ Add Bike</button>

                                <div className="form-group" style={{ marginBottom: '1rem', maxWidth: '280px' }}>
                                    <label className="label">Other Amount (PKR) <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— not counted in margin</span></label>
                                    <input type="text" inputMode="decimal" className="input" value={editOtherAmount}
                                        onChange={e => setEditOtherAmount(e.target.value)} placeholder="e.g. transport charges" />
                                </div>

                                {editStockValid && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '0.85rem' }}>Bikes: <strong>Rs. {editBikesTotal.toLocaleString()}</strong></span>
                                        {(Number(editOtherAmount) || 0) > 0 && <span style={{ fontSize: '0.85rem' }}>Other: <strong>Rs. {Number(editOtherAmount).toLocaleString()}</strong></span>}
                                        <span style={{ fontSize: '0.85rem' }}>Total: <strong style={{ color: 'var(--color-primary)' }}>Rs. {editTotalAmount.toLocaleString()}</strong></span>
                                        <span style={{ fontSize: '0.85rem' }}>Margin: <strong style={{ color: editTotalMargin >= 0 ? '#10b981' : '#ef4444' }}>Rs. {editTotalMargin.toLocaleString()}</strong></span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="label">Date</label>
                                        <input type="date" className="input" value={editDate} onChange={e => setEditDate(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                                        <label className="label">Note</label>
                                        <input className="input" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Optional note..." />
                                    </div>
                                </div>
                            </>
                        )}

                        <button className="btn btn-primary" disabled={editSubmitting || (editingTx.type === 'STOCK_GIVEN' && !editStockValid) || (editingTx.type === 'PAYMENT' && !editPaymentForm.amount)}
                            onClick={handleSaveEdit}>
                            {editSubmitting ? 'Saving...' : '✅ Save Changes'}
                        </button>
                    </div>
                )}

                {/* Transactions table */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
                        Transactions {selectedMonth !== 'ALL' ? `— ${monthLabel(selectedMonth)}` : '— All Time'}
                    </div>
                    {runningRows.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No transactions yet</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        {['Date', 'Description', 'Stock Given', 'Margin', 'Payment', 'Mode', 'Balance', ''].map(h => (
                                            <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Date' || h === 'Description' || h === '' ? 'left' : 'right', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...runningRows].reverse().map(tx => {
                                        const isDel = confirmDeleteTx === tx._id;
                                        return (
                                            <tr key={tx._id} style={{ borderBottom: '1px solid var(--color-border)', background: isDel ? 'rgba(239,68,68,0.04)' : editingTx?._id === tx._id ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                                                <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                                                    {new Date(tx.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '7px 10px' }}>
                                                    <div style={{ fontWeight: 500 }}>{tx.description}</div>
                                                    {tx.items && tx.items.length > 0 && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                            {tx.items.map((item, i) => (
                                                                <span key={i}>
                                                                    {i > 0 ? ' · ' : ''}{item.quantity}× {item.model} @ Rs.{item.pricePerUnit.toLocaleString()}
                                                                    {item.engineNumber && ` (${item.engineNumber} / ${item.chassisNumber})`}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {tx.note && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{tx.note}</div>}
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: tx.type === 'STOCK_GIVEN' ? '#ef4444' : 'var(--color-text-muted)' }}>
                                                    {tx.type === 'STOCK_GIVEN' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right', color: tx.type === 'STOCK_GIVEN' ? '#8b5cf6' : 'var(--color-text-muted)' }}>
                                                    {tx.type === 'STOCK_GIVEN' && (tx.margin || 0) !== 0 ? `Rs. ${(tx.margin || 0).toLocaleString()}` : '—'}
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: tx.type === 'PAYMENT' ? '#10b981' : 'var(--color-text-muted)' }}>
                                                    {tx.type === 'PAYMENT' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                                                    {tx.paymentMode ? (
                                                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: tx.paymentMode === 'CASH' ? 'rgba(16,185,129,0.12)' : tx.paymentMode === 'BANK_TRANSFER' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)', color: tx.paymentMode === 'CASH' ? '#10b981' : tx.paymentMode === 'BANK_TRANSFER' ? '#3b82f6' : '#ef4444' }}>
                                                            {tx.paymentMode === 'BANK_TRANSFER' ? 'BANK' : tx.paymentMode}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: tx.runningBalance > 0 ? '#f59e0b' : '#10b981' }}>
                                                    Rs. {tx.runningBalance.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '7px 10px' }}>
                                                    {isDel ? (
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => handleDeleteTx(tx._id)}>Yes</button>
                                                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => setConfirmDeleteTx(null)}>No</button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button className="btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                                                                onClick={() => { setConfirmDeleteTx(null); handleEditInit(tx); }}>✏️</button>
                                                            <button className="btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }} onClick={() => { setEditingTx(null); setConfirmDeleteTx(tx._id); }}>🗑️</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700, background: 'var(--color-bg-elevated)' }}>
                                        <td colSpan={2} style={{ padding: '8px 10px', color: 'var(--color-text-muted)' }}>
                                            {selectedMonth === 'ALL' ? 'All Time' : monthLabel(selectedMonth)}
                                        </td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ef4444' }}>Rs. {filteredDebit.toLocaleString()}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b5cf6' }}>Rs. {filteredMargin.toLocaleString()}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10b981' }}>Rs. {filteredCredit.toLocaleString()}</td>
                                        <td />
                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: party.balance > 0 ? '#f59e0b' : '#10b981' }}>
                                            {selectedMonth === 'ALL' ? `Balance: Rs. ${party.balance.toLocaleString()}` : ''}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
