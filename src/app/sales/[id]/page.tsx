'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './receipt.module.css';
import { BIKE_STANDARD_PRICES, RECEIPT_COLOURS, guessReceiptColour } from '@/lib/constants';
import Loader from '@/components/Loader';

const COLOUR_OPTIONS = RECEIPT_COLOURS.map(c => c.label);

function digitGroups(raw: string, groups: number[]) {
    const digits = (raw || '').replace(/[^0-9]/g, '');
    let idx = 0;
    return groups.map(count => {
        const chars: string[] = [];
        for (let i = 0; i < count; i++) {
            chars.push(digits[idx] ?? '');
            idx++;
        }
        return chars;
    });
}

function DigitBoxes({ value, groups }: { value: string; groups: number[] }) {
    return (
        <div className={styles.digitBoxes}>
            {digitGroups(value, groups).map((group, gi) => (
                <Fragment key={gi}>
                    {gi > 0 && <span className={styles.digitDash}>-</span>}
                    {group.map((ch, ci) => (
                        <span key={ci} className={styles.digitBox}>{ch}</span>
                    ))}
                </Fragment>
            ))}
        </div>
    );
}

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
    receiptColour?: string | null;
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
    const [deletingPayment, setDeletingPayment] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

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

    const handleDeletePayment = async (index: number, amount: number) => {
        if (!sale) return;
        if (!confirm(`Remove payment of Rs. ${amount.toLocaleString()}? This will add it back to the balance.`)) return;
        setDeletingPayment(index);
        try {
            const res = await fetch(`/api/sales/${sale.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ removePaymentIndex: index }),
            });
            if (res.ok) await fetchSale(sale.id);
        } finally {
            setDeletingPayment(null);
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

    const handleExportPDF = async () => {
        if (!receiptRef.current) return;
        setExporting(true);
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
            ]);
            // Force the desktop-width layout for the capture, regardless of the phone/screen
            // width the user is viewing on, so the PDF always matches the printed receipt.
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                windowWidth: 900,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const finalHeight = Math.min(imgHeight, pageHeight);
            const finalWidth = imgHeight > pageHeight ? (canvas.width * finalHeight) / canvas.height : imgWidth;
            const x = (pageWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'PNG', x, 0, finalWidth, finalHeight);
            const fileName = `Sale-Receipt-${(sale.customer.name || 'Customer').replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } finally {
            setExporting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">

                {/* ── Top bar ── */}
                <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Sale Receipt</h1>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button onClick={handleExportPDF} disabled={exporting} className="btn btn-secondary">
                            {exporting ? '⏳ Generating...' : '📄 Export PDF'}
                        </button>
                        <button onClick={() => window.print()} className="btn btn-primary">🖨️ Print Receipt</button>
                    </div>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            📅 {new Date(p.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <button
                                            onClick={() => handleDeletePayment(i, Number(p.amount))}
                                            disabled={deletingPayment === i}
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                            {deletingPayment === i ? '...' : '✕ Remove'}
                                        </button>
                                    </div>
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
                <div className={styles.receipt} ref={receiptRef}>
                    <div className={styles.topBar}>
                        <Image src="/honda-logo.png" alt="Honda" width={160} height={110} className={styles.hondaLogo} priority />

                        <div className={styles.titleRow}>
                            <div className={styles.serialNumber}>{sale.receiptNumber || sale.id}</div>
                            <div className={styles.receiptTitleBox}>SALE RECEIPT</div>
                        </div>

                        <div className={styles.badgeArea}>
                            <div className={styles.badgeStripe}><span /><span /><span /></div>
                            <div className={styles.badgeRow}>
                                <div className={styles.badgeCircle}>3S</div>
                                <div className={styles.badgeText}>SALES<br />SERVICE<br />SPARE PARTS</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.idRow}>
                        <div className={styles.digitField}>
                            <span className={styles.digitLabel}>C.N.I.C #:</span>
                            <DigitBoxes value={sale.customer.cnic} groups={[5, 7, 1]} />
                        </div>
                        <div className={styles.digitField}>
                            <span className={styles.digitLabel}>Dated:</span>
                            <DigitBoxes
                                value={new Date(sale.saleDate).toLocaleDateString('en-GB').replace(/\//g, '')}
                                groups={[2, 2, 4]}
                            />
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <span className={styles.label}>Customer&apos;s Name:</span>
                            <span className={styles.value}>{sale.customer.name}</span>
                        </div>
                        {sale.customer.fatherName && (
                            <div className={styles.field}>
                                <span className={styles.label}>Father/Husband Name:</span>
                                <span className={styles.value}>{sale.customer.fatherName}</span>
                            </div>
                        )}
                        <div className={styles.field}>
                            <span className={styles.label}>Address:</span>
                            <span className={styles.value}>{sale.customer.address || ''}</span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Mobile #:</span>
                            <span className={styles.value}>{sale.customer.mobile || ''}</span>
                        </div>
                    </div>

                    <div className={styles.bikeModels}>
                        <span className={styles.modelLabel}>Honda:</span>
                        <div className={styles.models}>
                            {[
                                { label: 'CD70', match: 'CD70' },
                                { label: 'DREAM', match: 'DREAM' },
                                { label: 'PRIDOR', match: 'PRIDOR' },
                                { label: 'CG 125', match: 'CG 125' },
                                { label: 'CG125S.SE', match: 'CG125S.SE' },
                                { label: 'CG125GOLD', match: 'CG125GOLD' },
                                { label: 'CB125F.SE', match: 'CB125F.SE' },
                                { label: 'CB150F', match: 'CB150F' },
                                { label: 'CB150FSE', match: 'CB150FSE' },
                                { label: 'CG 150', match: 'CG150 2-Tone' },
                            ].map(({ label, match }) => {
                                const isChecked = sale.bike.model === match;
                                return (
                                    <label key={label} className={isChecked ? styles.checked : ''}>
                                        <input type="checkbox" readOnly checked={isChecked} /> {label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.field}>
                        <span className={styles.label}>Model:</span>
                        <span className={styles.value}>{new Date(sale.saleDate).getFullYear()}</span>
                    </div>

                    <div className={styles.specsRow}>
                        <div className={styles.boxedField}>
                            <span className={styles.label}>Engine #:</span>
                            <span className={styles.value}>{sale.bike.engineNumber}</span>
                        </div>
                        <div className={styles.boxedField}>
                            <span className={styles.label}>Chassis #:</span>
                            <span className={styles.value}>{sale.bike.chassisNumber}</span>
                        </div>
                    </div>

                    <div className={styles.colourPaymentRow}>
                        <div className={styles.colourText}>
                            Colour: {COLOUR_OPTIONS.map((c, i) => (
                                <Fragment key={c}>
                                    {i > 0 && ' / '}
                                    {(sale.receiptColour || guessReceiptColour(sale.bike.color)) === c ? <strong>{c}</strong> : c}
                                </Fragment>
                            ))}
                            {/* Fallback: colour doesn't match any checklist item (e.g. Grey, Maroon) — print it anyway so it's never blank */}
                            {!(sale.receiptColour || guessReceiptColour(sale.bike.color)) && sale.bike.color && (
                                <strong> ({sale.bike.color})</strong>
                            )}
                        </div>
                        <div className={styles.paymentModes}>
                            {['CASH', 'CREDIT', 'LEASE'].map(m => (
                                <label key={m} className={sale.paymentMode === m ? styles.checked : ''}>
                                    <input type="checkbox" readOnly checked={sale.paymentMode === m} /> {m}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={styles.priceSection}>
                        <div className={styles.field}>
                            <span className={styles.label}>Cash Price:</span>
                            <span className={styles.value}>
                                {(BIKE_STANDARD_PRICES[sale.bike.model] || Number(sale.price)).toLocaleString()}
                            </span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Advance Amount:</span>
                            <span className={styles.value}>{sale.advanceAmount || ''}</span>
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
                                {sale.balance ? Number(sale.balance).toLocaleString() : ''}
                            </span>
                        </div>
                        <div className={styles.field}>
                            <span className={styles.label}>Registration Fees:</span>
                            <span className={styles.value}>
                                {sale.registrationCost ? Number(sale.registrationCost).toLocaleString() : ''}
                            </span>
                        </div>

                        {/* Payment history inside receipt (visible on print) — capped so it can never push the receipt past one A4 page */}
                        {payments.length > 0 && (() => {
                            const MAX_ROWS = 3;
                            const shown = payments.slice(0, MAX_ROWS);
                            const hiddenCount = payments.length - shown.length;
                            const rowFont = payments.length > MAX_ROWS ? '0.68rem' : '0.75rem';
                            return (
                                <div style={{ marginTop: '0.4rem', borderTop: '1px solid #ccc', paddingTop: '0.3rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.2rem' }}>Payment History:</div>
                                    {shown.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: rowFont, marginBottom: '0.1rem' }}>
                                            <span>{new Date(p.date).toLocaleDateString()}{p.note ? ` — ${p.note}` : ''}</span>
                                            <strong>Rs. {Number(p.amount).toLocaleString()}</strong>
                                        </div>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <div style={{ fontSize: '0.68rem', fontStyle: 'italic', color: '#555' }}>
                                            +{hiddenCount} more payment{hiddenCount > 1 ? 's' : ''} — see Khata for full history
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <div className={styles.urduBox}>
                        <p className={styles.urduText}>نوٹ: یہ رسید رجسٹریشن کیلئے استعمال نہیں ہو سکتی۔ اصل کاغذات کے حصول کیلئے یہ رسید اور اصل شناختی کارڈ ضرور لائیں۔ نیز موٹر سائیکل کی تاریخ خرید اور گاہک کا نام تبدیل نہ ہوگا۔</p>
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
