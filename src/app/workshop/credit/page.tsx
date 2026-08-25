'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Loader from '@/components/Loader';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface BillItem {
    stockId?: string;
    name: string;
    quantity: number;
    retailPrice: number;
    customerPrice: number;
}

interface Payment {
    amount: number;
    date: string;
    note?: string;
    paymentMode?: string;
}

interface CreditBill {
    _id: string;
    customerName: string;
    customerMobile?: string;
    bikeNumber?: string;
    serviceType: string;
    serviceCharges: number;
    items: BillItem[];
    totalAmount: number;
    balance: number;
    payments?: Payment[];
    date: string;
}

interface CustomerGroup {
    key: string;
    customerName: string;
    customerMobile?: string;
    bills: CreditBill[];
    totalCredit: number;
    totalPaid: number;
    totalPending: number;
}

const today = () => new Date().toISOString().split('T')[0];

export default function WorkshopCreditPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [bills, setBills] = useState<CreditBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
    const [expandedBill, setExpandedBill] = useState<string | null>(null);
    const [payingBill, setPayingBill] = useState<string | null>(null);
    const [payForm, setPayForm] = useState({ amount: '', date: today(), note: '', paymentMode: 'CASH' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchBills(); }, []);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/workshop?paymentMode=CREDIT&limit=2000');
            if (res.ok) setBills(await res.json());
            else showToast('Could not load workshop credit — reload the page to check', 'error');
        } catch {
            showToast('Could not load workshop credit — check your connection', 'error');
        } finally {
            setLoading(false);
        }
    };

    const groups: CustomerGroup[] = (() => {
        const map = new Map<string, CustomerGroup>();
        for (const b of bills) {
            const key = `${b.customerName.trim().toLowerCase()}|${(b.customerMobile || '').trim()}`;
            if (!map.has(key)) {
                map.set(key, { key, customerName: b.customerName, customerMobile: b.customerMobile, bills: [], totalCredit: 0, totalPaid: 0, totalPending: 0 });
            }
            const g = map.get(key)!;
            g.bills.push(b);
            g.totalCredit += b.totalAmount;
            g.totalPending += b.balance ?? 0;
            g.totalPaid += b.totalAmount - (b.balance ?? 0);
        }
        return Array.from(map.values()).sort((a, b) => b.totalPending - a.totalPending);
    })();

    const grandTotalCredit = groups.reduce((s, g) => s + g.totalCredit, 0);
    const grandTotalPaid = groups.reduce((s, g) => s + g.totalPaid, 0);
    const grandTotalPending = groups.reduce((s, g) => s + g.totalPending, 0);

    const startPayment = (bill: CreditBill) => {
        setPayingBill(bill._id);
        setPayForm({ amount: '', date: today(), note: '', paymentMode: 'CASH' });
    };

    const submitPayment = async (bill: CreditBill) => {
        const amt = Number(payForm.amount);
        if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
        if (amt > bill.balance) { showToast(`Amount exceeds pending balance (Rs. ${bill.balance.toLocaleString()})`, 'error'); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/workshop/${bill._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addPayment: { amount: amt, date: payForm.date, note: payForm.note, paymentMode: payForm.paymentMode } }),
            });
            if (res.ok) {
                showToast('Payment recorded', 'success');
                setPayingBill(null);
                await fetchBills();
            } else {
                const err = await res.json().catch(() => ({ message: 'Failed to record payment' }));
                showToast(err.message || 'Failed to record payment', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Error recording payment', 'error');
        } finally {
            setSaving(false);
        }
    };

    const removePayment = async (bill: CreditBill, index: number, amount: number) => {
        if (!confirm(`Remove payment of Rs. ${amount.toLocaleString()}? This will add it back to the pending balance.`)) return;
        try {
            const res = await fetch(`/api/workshop/${bill._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ removePaymentIndex: index }),
            });
            if (res.ok) await fetchBills();
            else showToast('Failed to remove payment', 'error');
        } catch {
            showToast('Failed to remove payment', 'error');
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem' }}>Workshop Credit</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Customers who took service on credit — how much they owe, how much they've paid, and what's still pending.
                </p>

                {loading ? (
                    <Loader size={160} text="Loading workshop credit..." />
                ) : (
                    <>
                        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Total Credit Given</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>Rs. {grandTotalCredit.toLocaleString()}</div>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Total Paid</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>Rs. {grandTotalPaid.toLocaleString()}</div>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Total Pending</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>Rs. {grandTotalPending.toLocaleString()}</div>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Customers on Credit</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{groups.length}</div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0 }}>
                            {groups.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No workshop credit bills yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {groups.map(g => (
                                        <div key={g.key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <div
                                                onClick={() => setExpandedCustomer(expandedCustomer === g.key ? null : g.key)}
                                                style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{g.customerName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                        {g.customerMobile || 'No mobile'} · {g.bills.length} bill{g.bills.length > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Credit</div>
                                                        <div style={{ fontWeight: 700 }}>Rs. {g.totalCredit.toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Paid</div>
                                                        <div style={{ fontWeight: 700, color: '#10b981' }}>Rs. {g.totalPaid.toLocaleString()}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Pending</div>
                                                        <div style={{ fontWeight: 700, color: g.totalPending > 0 ? '#ef4444' : '#10b981' }}>Rs. {g.totalPending.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {expandedCustomer === g.key && (
                                                <div style={{ padding: '0 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                    {g.bills.map(bill => (
                                                        <div key={bill._id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', padding: '0.75rem 1rem' }}>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                                        {new Date(bill.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} · {bill.serviceType}
                                                                        {bill.bikeNumber && ` · ${bill.bikeNumber}`}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                                        Total Rs. {bill.totalAmount.toLocaleString()} · Paid Rs. {(bill.totalAmount - (bill.balance ?? 0)).toLocaleString()} · Pending{' '}
                                                                        <strong style={{ color: (bill.balance ?? 0) > 0 ? '#ef4444' : '#10b981' }}>Rs. {(bill.balance ?? 0).toLocaleString()}</strong>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                                                        onClick={() => setExpandedBill(expandedBill === bill._id ? null : bill._id)}>
                                                                        {expandedBill === bill._id ? 'Hide Items' : 'View Items'}
                                                                    </button>
                                                                    {(bill.balance ?? 0) > 0 && (
                                                                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                                                            onClick={() => startPayment(bill)}>💰 Record Payment</button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {expandedBill === bill._id && (
                                                                <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--color-border)' }}>
                                                                    <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                                                <th style={{ textAlign: 'left', padding: '3px' }}>Item</th>
                                                                                <th style={{ textAlign: 'right', padding: '3px' }}>Qty</th>
                                                                                <th style={{ textAlign: 'right', padding: '3px' }}>Price</th>
                                                                                <th style={{ textAlign: 'right', padding: '3px' }}>Total</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {bill.serviceCharges > 0 && (
                                                                                <tr>
                                                                                    <td style={{ padding: '3px' }}>Labour</td>
                                                                                    <td style={{ textAlign: 'right', padding: '3px' }}>1</td>
                                                                                    <td style={{ textAlign: 'right', padding: '3px' }}>Rs. {bill.serviceCharges.toLocaleString()}</td>
                                                                                    <td style={{ textAlign: 'right', padding: '3px' }}>Rs. {bill.serviceCharges.toLocaleString()}</td>
                                                                                </tr>
                                                                            )}
                                                                            {bill.items.map((it, i) => (
                                                                                <tr key={i}>
                                                                                    <td style={{ padding: '3px' }}>{it.name}</td>
                                                                                    <td style={{ textAlign: 'right', padding: '3px' }}>{it.quantity}</td>
                                                                                    <td style={{ textAlign: 'right', padding: '3px' }}>Rs. {it.customerPrice.toLocaleString()}</td>
                                                                                    <td style={{ textAlign: 'right', padding: '3px' }}>Rs. {(it.customerPrice * it.quantity).toLocaleString()}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>

                                                                    {bill.payments && bill.payments.length > 0 && (
                                                                        <div style={{ marginTop: '0.6rem' }}>
                                                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Payment History</div>
                                                                            {bill.payments.map((p, i) => (
                                                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.5rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '6px', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                                                                                    <span>
                                                                                        Rs. {Number(p.amount).toLocaleString()}
                                                                                        {p.note && ` — ${p.note}`}
                                                                                        {' · '}{p.paymentMode === 'BANK_TRANSFER' ? 'Bank' : 'Cash'}
                                                                                        {' · '}{new Date(p.date).toLocaleDateString()}
                                                                                    </span>
                                                                                    <button onClick={() => removePayment(bill, i, Number(p.amount))}
                                                                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                                                                                        ✕
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {payingBill === bill._id && (
                                                                <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--color-border)' }}>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: '0.5rem', alignItems: 'end' }}>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Amount (Rs.) *</label>
                                                                            <input type="text" inputMode="decimal" className="input" value={payForm.amount}
                                                                                onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                                                                        </div>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Payment Mode</label>
                                                                            <select className="select" value={payForm.paymentMode}
                                                                                onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })}>
                                                                                <option value="CASH">Cash</option>
                                                                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Date</label>
                                                                            <input type="date" className="input" value={payForm.date}
                                                                                onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
                                                                        </div>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Note (optional)</label>
                                                                            <input type="text" className="input" placeholder="e.g. Cash received"
                                                                                value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                                            <button className="btn btn-success" disabled={saving} style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                                                                                onClick={() => submitPayment(bill)}>{saving ? '...' : '✓ Save'}</button>
                                                                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                                                                                onClick={() => setPayingBill(null)}>✕</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
