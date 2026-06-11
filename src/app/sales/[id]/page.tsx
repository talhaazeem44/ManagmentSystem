'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './receipt.module.css';
import { BIKE_STANDARD_PRICES } from '@/lib/constants';
import Loader from '@/components/Loader';

interface Payment {
    amount: number;
    date: string;
    note?: string;
}

interface Sale {
    id: string;
    saleDate: string;
    price: number;
    advanceAmount?: number | string;
    receivedCash?: number;
    balance?: number;
    registrationCost: number | null;
    bankTransferAmount?: number;
    paymentMode: string;
    receiptNumber: string | null;
    payments?: Payment[];
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder: { doNumber: string };
    };
    customer: {
        name: string;
        cnic: string;
        fatherName: string | null;
        address: string | null;
        mobile: string | null;
    };
}

const today = () => new Date().toISOString().split('T')[0];

export default function ReceiptPage() {
    const params = useParams();
    const [sale, setSale] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(true);
    const [payForm, setPayForm] = useState({ amount: '', date: today(), note: '' });
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');

    useEffect(() => {
        if (params.id) fetchSale(params.id as string);
    }, [params.id]);

    const fetchSale = async (id: string) => {
        try {
            const res = await fetch(`/api/sales/${id}`);
            if (res.ok) setSale(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sale) return;
        const amt = Number(payForm.amount);
        if (!amt || amt <= 0) { setPayError('Enter a valid amount'); return; }
        if (amt > (sale.balance ?? 0)) { setPayError(`Amount exceeds balance (Rs. ${(sale.balance ?? 0).toLocaleString()})`); return; }
        setPaying(true); setPayError('');
        try {
            const res = await fetch(`/api/sales/${sale.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addPayment: { amount: amt, date: payForm.date, note: payForm.note } }),
            });
            if (res.ok) {
                setPayForm({ amount: '', date: today(), note: '' });
                await fetchSale(sale.id);
            } else {
                const err = await res.json();
                setPayError(err.message || 'Failed to record payment');
            }
        } finally {
            setPaying(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <Loader size={160} fullPage />
        </DashboardLayout>
    );

    if (!sale) return (
        <DashboardLayout>
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</p>
                <p style={{ color: 'var(--color-text-muted)' }}>Sale not found</p>
            </div>
        </DashboardLayout>
    );

    const isCreditWithBalance = sale.paymentMode === 'CREDIT' && (sale.balance ?? 0) > 0;
    const payments = sale.payments ?? [];

    return (
        <DashboardLayout>
            <div className="animate-fade-in">

                {/* ── Top bar ── */}
                <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Sale Receipt</h1>
                    <button onClick={() => window.print()} className="btn btn-primary">🖨️ Print Receipt</button>
                </div>

                {/* ── Record Payment (credit only, screen only) ── */}
                {isCreditWithBalance && (
                    <div className="no-print card" style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444' }}>Record Payment</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Outstanding balance: <strong style={{ color: '#ef4444' }}>Rs. {(sale.balance ?? 0).toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handlePayment}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Amount (Rs.) *</label>
                                    <input type="text" inputMode="decimal" className="input" placeholder="50,000"
                                        value={payForm.amount}
                                        onChange={e => { setPayForm({ ...payForm, amount: e.target.value }); setPayError(''); }} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Payment Date *</label>
                                    <input type="date" className="input" value={payForm.date}
                                        onChange={e => setPayForm({ ...payForm, date: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>Note (optional)</label>
                                    <input type="text" className="input" placeholder="e.g. Cash received"
                                        value={payForm.note}
                                        onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={paying} style={{ whiteSpace: 'nowrap' }}>
                                    {paying ? 'Saving...' : '✓ Record'}
                                </button>
                            </div>
                            {payError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{payError}</p>}
                        </form>
                    </div>
                )}

                {/* ── Payment history (screen only) ── */}
                {payments.length > 0 && (
                    <div className="no-print card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                            Payment History
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {payments.map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Rs. {Number(p.amount).toLocaleString()}</span>
                                        {p.note && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>{p.note}</span>}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        📅 {new Date(p.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {(sale.balance ?? 0) === 0 && (
                            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#10b981', textAlign: 'center' }}>
                                ✓ Fully Paid
                            </div>
                        )}
                    </div>
                )}

                {/* ── Printable receipt ── */}
                <div className={styles.receipt}>
                    <div className={styles.header}>
                        <div className={styles.logo}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.05em' }}>HONDA</span>
                        </div>
                        <div className={styles.receiptTitle}>SALE RECEIPT</div>
                        <div className={styles.receiptNumber}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>3S SALES SERVICE SPARE PARTS</div>
                            <div>{sale.receiptNumber || `#${sale.id}`}</div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <span className={styles.label}>C.N.I.C #:</span>
                                <span className={styles.value}>{sale.customer.cnic}</span>
                            </div>
                            <div className={styles.field}>
                                <span className={styles.label}>Dated:</span>
                                <span className={styles.value}>{new Date(sale.saleDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Customer's Name:</span>
                            <span className={styles.value}>{sale.customer.name}</span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Father/Husband Name:</span>
                            <span className={styles.value}>{sale.customer.fatherName || '-'}</span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Address:</span>
                            <span className={styles.value}>{sale.customer.address || '-'}</span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Mobile #:</span>
                            <span className={styles.value}>{sale.customer.mobile || '-'}</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.bikeModels}>
                            <span className={styles.modelLabel}>Honda:</span>
                            <div className={styles.models}>
                                {['CD70','DREAM','PRIDOR','CG 125','CG125S.SE','CB125F.SE','CB150F'].map(m => (
                                    <label key={m} className={sale.bike.model === m || (m === 'CG125S.SE' && sale.bike.model.includes('CG125')) || (m === 'CB125F.SE' && sale.bike.model.includes('CB125')) ? styles.checked : ''}>
                                        <input type="checkbox" readOnly
                                            checked={sale.bike.model === m || (m === 'CG125S.SE' && sale.bike.model.includes('CG125')) || (m === 'CB125F.SE' && sale.bike.model.includes('CB125'))} /> {m}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className={styles.row}>
                            <div className={styles.field}>
                                <span className={styles.label}>Model:</span>
                                <span className={styles.value}>{new Date(sale.saleDate).getFullYear()}</span>
                            </div>
                            <div className={styles.field}>
                                <span className={styles.label}>Colour:</span>
                                <span className={styles.value}>{sale.bike.color}</span>
                            </div>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Engine #:</span>
                            <span className={styles.value}>{sale.bike.engineNumber}</span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Chassis #:</span>
                            <span className={styles.value}>{sale.bike.chassisNumber}</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.paymentModes}>
                            {['CASH','CREDIT','LEASE','ONLINE'].map(m => (
                                <label key={m} className={sale.paymentMode === m ? styles.checked : ''}>
                                    <input type="checkbox" readOnly checked={sale.paymentMode === m} /> {m}
                                </label>
                            ))}
                        </div>

                        <div className={styles.paymentDetails}>
                            <div className={styles.paymentCol}>
                                <div className={styles.field}>
                                    <span className={styles.label}>Cash Price:</span>
                                    <span className={styles.value}>
                                        {(BIKE_STANDARD_PRICES[sale.bike.model] || Number(sale.price)).toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.field}>
                                    <span className={styles.label}>Advance Amount:</span>
                                    <span className={styles.value}>{sale.advanceAmount || '-'}</span>
                                </div>
                                <div className={styles.field}>
                                    <span className={styles.label}>Received Cash:</span>
                                    <span className={styles.value}>
                                        {sale.paymentMode === 'CASH' || sale.paymentMode === 'ONLINE'
                                            ? (BIKE_STANDARD_PRICES[sale.bike.model] || Number(sale.price)).toLocaleString()
                                            : Number(sale.receivedCash || 0).toLocaleString()}
                                    </span>
                                </div>
                                {sale.bankTransferAmount ? (
                                    <div className={styles.field}>
                                        <span className={styles.label}>Bank Transfer:</span>
                                        <span className={styles.value}>{Number(sale.bankTransferAmount).toLocaleString()}</span>
                                    </div>
                                ) : null}
                                <div className={styles.field}>
                                    <span className={styles.label}>Balance:</span>
                                    <span className={styles.value}>
                                        {sale.balance ? Number(sale.balance).toLocaleString() : '-'}
                                    </span>
                                </div>
                                <div className={styles.field}>
                                    <span className={styles.label}>Registration Fees:</span>
                                    <span className={styles.value}>
                                        {sale.registrationCost ? Number(sale.registrationCost).toLocaleString() : '-'}
                                    </span>
                                </div>

                                {/* Payment history inside receipt (visible on print) */}
                                {payments.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>Payment History:</div>
                                        {payments.map((p, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                                                <span>{new Date(p.date).toLocaleDateString()}{p.note ? ` — ${p.note}` : ''}</span>
                                                <strong>Rs. {Number(p.amount).toLocaleString()}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={styles.urduSection}>
                                <div className={styles.urduBox}>
                                    <p className={styles.urduText}>نوٹ:</p>
                                    <p className={styles.urduText}>یہ رسید رجسٹریشن کیلئے استعمال نہیں ہو سکتی۔</p>
                                    <p className={styles.urduText}>اصل کاغذات کے حصول کیلئے سیل رسید اور</p>
                                    <p className={styles.urduText}>اصل شناختی کارڈ ضرور لائیں۔ نیز موٹر سائیکل</p>
                                    <p className={styles.urduText}>کی تاریخ خرید اور گاہک کا نام تبدیل نہ ہوگا۔</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.dealerInfo}>
                            <strong>NAEEM AUTOS</strong>
                            <p>📍 1.5 Km Daska Road, Sambrial</p>
                            <p>📞 Ph: 052-6525001-2 Cell: 0331-8800216, 0334-8179775</p>
                        </div>
                        <div className={styles.signature}>
                            <div className={styles.signatureLine} />
                            <p>Customer Signature</p>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
