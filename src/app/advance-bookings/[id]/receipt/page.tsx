'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './receipt.module.css';
import saleStyles from '../../../sales/[id]/receipt.module.css';
import { BIKE_STANDARD_PRICES, RECEIPT_COLOURS, guessReceiptColour } from '@/lib/constants';

const COLOUR_OPTIONS = RECEIPT_COLOURS.map(c => c.label);

const SALE_MODELS = ['CD70', 'DREAM', 'PRIDOR', 'CG 125', 'CG125S.SE', 'CG125GOLD', 'CB125F.SE', 'CB150F', 'CB150FSE', 'CG 150'];

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
        <div className={saleStyles.digitBoxes}>
            {digitGroups(value, groups).map((group, gi) => (
                <Fragment key={gi}>
                    {gi > 0 && <span className={saleStyles.digitDash}>-</span>}
                    {group.map((ch, ci) => (
                        <span key={ci} className={saleStyles.digitBox}>{ch}</span>
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
    paymentMode?: string;
}

interface Booking {
    _id: string;
    customerName: string;
    customerMobile?: string;
    cnic?: string;
    bikeModel?: string;
    bikeColor?: string;
    careOf?: string;
    advancePaid: number;
    totalPrice?: number;
    registrationFee?: number;
    margin?: number;
    notes?: string;
    status: 'PENDING' | 'DELIVERED';
    date: string;
    expectedDeliveryDate?: string;
    engineNumber?: string;
    chassisNumber?: string;
    payments?: Payment[];
    updatedAt?: string;
}

const MODELS = ['CD70', 'DREAM', 'PRIDOR', 'CG 125', 'CG125S.SE', 'CB125F.SE', 'CB150F'];

export default function AdvanceBookingReceiptPage() {
    const params = useParams();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (params.id) {
            fetch(`/api/advance-bookings/${params.id}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => { setBooking(data); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [params.id]);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Loading receipt...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!booking) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</p>
                    <p style={{ color: 'var(--color-text-muted)' }}>Booking not found</p>
                </div>
            </DashboardLayout>
        );
    }

    const isDelivered = booking.status === 'DELIVERED';

    // Printed "Total Price" always shows the fixed standard price for the model, not whatever
    // amount was typed into the booking form. Advance Amount and Balance must both stay
    // consistent with that same number — Advance Amount never prints more than the total
    // price (any extra collected above standard price is never shown on the receipt), and
    // Balance never goes negative.
    const displayTotalPrice = BIKE_STANDARD_PRICES[booking.bikeModel || ''] || booking.totalPrice || 0;
    const displayAdvancePaid = Math.min(booking.advancePaid, displayTotalPrice);
    const remaining = displayTotalPrice ? Math.max(0, displayTotalPrice - booking.advancePaid) : null;

    // Payments recorded after booking creation are only ever the balance collected at
    // delivery (see PATCH /api/advance-bookings/[id]) — so the original advance paid up
    // front is whatever's left of advancePaid once those are subtracted back out.
    const payments = booking.payments ?? [];
    const collectedAtDelivery = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const originalAdvance = Math.max(0, displayAdvancePaid - collectedAtDelivery);

    const deliveryDate = isDelivered && booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.date);
    const receiptColour = guessReceiptColour(booking.bikeColor || '');

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
            const fileNamePrefix = isDelivered ? 'Sale-Receipt' : 'Advance-Receipt';
            const fileName = `${fileNamePrefix}-${(booking.customerName || 'Customer').replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } finally {
            setExporting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{isDelivered ? 'Sale Receipt' : 'Advance Booking Receipt'}</h1>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button onClick={handleExportPDF} disabled={exporting} className="btn btn-secondary">
                            {exporting ? '⏳ Generating...' : '📄 Export PDF'}
                        </button>
                        <button onClick={() => window.print()} className="btn btn-primary">
                            🖨️ Print Receipt
                        </button>
                    </div>
                </div>

                {isDelivered ? (
                    /* ── Delivered: styled the same as a real Sale receipt ── */
                    <div className={saleStyles.receipt} ref={receiptRef}>
                        <div className={saleStyles.topBar}>
                            <Image src="/honda-logo.png" alt="Honda" width={160} height={110} className={saleStyles.hondaLogo} priority />

                            <div className={saleStyles.titleRow}>
                                {/* <div className={saleStyles.serialNumber}>{booking._id}</div> */}
                                <div className={saleStyles.receiptTitleBox}>SALE RECEIPT</div>
                            </div>

                            <div className={saleStyles.badgeArea}>
                                <div className={saleStyles.badgeStripe}><span /><span /><span /></div>
                                <div className={saleStyles.badgeRow}>
                                    <div className={saleStyles.badgeCircle}>3S</div>
                                    <div className={saleStyles.badgeText}>SALES<br />SERVICE<br />SPARE PARTS</div>
                                </div>
                            </div>
                        </div>

                        <div className={saleStyles.idRow}>
                            <div className={saleStyles.digitField}>
                                <span className={saleStyles.digitLabel}>C.N.I.C #:</span>
                                <DigitBoxes value={booking.cnic || ''} groups={[5, 7, 1]} />
                            </div>
                            <div className={saleStyles.digitField}>
                                <span className={saleStyles.digitLabel}>Dated:</span>
                                <DigitBoxes
                                    value={deliveryDate.toLocaleDateString('en-GB').replace(/\//g, '')}
                                    groups={[2, 2, 4]}
                                />
                            </div>
                        </div>

                        <div className={saleStyles.section}>
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Customer&apos;s Name:</span>
                                <span className={saleStyles.value}>{booking.customerName}</span>
                            </div>
                            {booking.careOf && (
                                <div className={saleStyles.field}>
                                    <span className={saleStyles.label}>Care of:</span>
                                    <span className={saleStyles.value}>{booking.careOf}</span>
                                </div>
                            )}
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Mobile #:</span>
                                <span className={saleStyles.value}>{booking.customerMobile || ''}</span>
                            </div>
                        </div>

                        <div className={saleStyles.bikeModels}>
                            <span className={saleStyles.modelLabel}>Honda:</span>
                            <div className={saleStyles.models}>
                                {SALE_MODELS.map(m => (
                                    <label key={m} className={booking.bikeModel === m ? saleStyles.checked : ''}>
                                        <input type="checkbox" readOnly checked={booking.bikeModel === m} /> {m}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={saleStyles.field}>
                            <span className={saleStyles.label}>Model:</span>
                            <span className={saleStyles.value}>{deliveryDate.getFullYear()}</span>
                        </div>

                        <div className={saleStyles.specsRow}>
                            <div className={saleStyles.boxedField}>
                                <span className={saleStyles.label}>Engine #:</span>
                                <span className={saleStyles.value}>{booking.engineNumber || ''}</span>
                            </div>
                            <div className={saleStyles.boxedField}>
                                <span className={saleStyles.label}>Chassis #:</span>
                                <span className={saleStyles.value}>{booking.chassisNumber || ''}</span>
                            </div>
                        </div>

                        <div className={saleStyles.colourPaymentRow}>
                            <div className={saleStyles.colourText}>
                                Colour: {COLOUR_OPTIONS.map((c, i) => (
                                    <Fragment key={c}>
                                        {i > 0 && ' / '}
                                        {receiptColour === c ? <strong>{c}</strong> : c}
                                    </Fragment>
                                ))}
                                {!receiptColour && booking.bikeColor && <strong> ({booking.bikeColor})</strong>}
                            </div>
                            <div className={saleStyles.paymentModes}>
                                {['CASH', 'CREDIT', 'LEASE'].map(m => (
                                    <label key={m} className={m === 'CASH' ? saleStyles.checked : ''}>
                                        <input type="checkbox" readOnly checked={m === 'CASH'} /> {m}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={saleStyles.priceSection}>
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Cash Price:</span>
                                <span className={saleStyles.value}>{displayTotalPrice.toLocaleString()}</span>
                            </div>
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Advance Amount:</span>
                                <span className={saleStyles.value}>{originalAdvance.toLocaleString()}</span>
                            </div>
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Received Cash:</span>
                                <span className={saleStyles.value}>{collectedAtDelivery.toLocaleString()}</span>
                            </div>
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Balance:</span>
                                <span className={saleStyles.value}>{remaining ? remaining.toLocaleString() : ''}</span>
                            </div>
                            <div className={saleStyles.field}>
                                <span className={saleStyles.label}>Registration Fees:</span>
                                <span className={saleStyles.value}>
                                    {booking.registrationFee ? booking.registrationFee.toLocaleString() : ''}
                                </span>
                            </div>
                        </div>

                        <div className={saleStyles.urduBox}>
                            <p className={saleStyles.urduText}>نوٹ: یہ رسید رجسٹریشن کیلئے استعمال نہیں ہو سکتی۔ اصل کاغذات کے حصول کیلئے یہ رسید اور اصل شناختی کارڈ ضرور لائیں۔ نیز موٹر سائیکل کی تاریخ خرید اور گاہک کا نام تبدیل نہ ہوگا۔</p>
                        </div>

                        <div className={saleStyles.footer}>
                            <div className={saleStyles.dealerInfo}>
                                <strong>NAEEM AUTOS</strong>
                                <p>📍 1.5 Km Daska Road, Sambrial</p>
                                <p>📞 Ph: 052-6525001-2 Cell: 0331-8800216, 0334-8179775</p>
                            </div>
                            <div className={saleStyles.signature}>
                                <div className={saleStyles.signatureLine} />
                                <p>Customer Signature</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Pending: advance booking confirmation slip ── */
                    <div className={styles.receipt} ref={receiptRef}>
                        <div className={styles.header}>
                            <div className={styles.logo}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.05em' }}>HONDA</span>
                            </div>
                            <div className={styles.receiptTitle}>ADVANCE BOOKING</div>
                            <div className={styles.receiptNumber}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>3S SALES SERVICE SPARE PARTS</div>
                                <div>{new Date(booking.date).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <span className={styles.label}>C.N.I.C #:</span>
                                    <span className={styles.value}>{booking.cnic || '-'}</span>
                                </div>
                                <div className={styles.field}>
                                    <span className={styles.label}>Dated:</span>
                                    <span className={styles.value}>{new Date(booking.date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className={styles.field}>
                                <span className={styles.label}>Customer&apos;s Name:</span>
                                <span className={styles.value}>{booking.customerName}</span>
                            </div>

                            {booking.careOf && (
                                <div className={styles.field}>
                                    <span className={styles.label}>Care of:</span>
                                    <span className={styles.value}>{booking.careOf}</span>
                                </div>
                            )}

                            <div className={styles.field}>
                                <span className={styles.label}>Mobile #:</span>
                                <span className={styles.value}>{booking.customerMobile || '-'}</span>
                            </div>

                            {booking.expectedDeliveryDate && (
                                <div className={styles.field}>
                                    <span className={styles.label}>Delivery Time:</span>
                                    <span className={styles.value}>
                                        {new Date(booking.expectedDeliveryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}

                            {booking.notes && (
                                <div className={styles.field}>
                                    <span className={styles.label}>Notes:</span>
                                    <span className={styles.value}>{booking.notes}</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.section}>
                            <div className={styles.bikeModels}>
                                <span className={styles.modelLabel}>Honda:</span>
                                <div className={styles.models}>
                                    {MODELS.map(m => (
                                        <label key={m} className={booking.bikeModel === m ? styles.checked : ''}>
                                            <input type="checkbox" checked={booking.bikeModel === m} readOnly /> {m}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.field}>
                                    <span className={styles.label}>Model:</span>
                                    <span className={styles.value}>{new Date(booking.date).getFullYear()}</span>
                                </div>
                                <div className={styles.field}>
                                    <span className={styles.label}>Colour:</span>
                                    <span className={styles.value}>{booking.bikeColor || '-'}</span>
                                </div>
                            </div>

                            {booking.engineNumber && (
                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <span className={styles.label}>Engine #:</span>
                                        <span className={styles.value}>{booking.engineNumber}</span>
                                    </div>
                                    <div className={styles.field}>
                                        <span className={styles.label}>Chassis #:</span>
                                        <span className={styles.value}>{booking.chassisNumber}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.section}>
                            <div className={styles.paymentDetails}>
                                <div className={styles.paymentCol}>
                                    <div className={styles.field}>
                                        <span className={styles.label}>Total Price:</span>
                                        <span className={styles.value}>
                                            {displayTotalPrice.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className={styles.field}>
                                        <span className={styles.label}>Advance Amount:</span>
                                        <span className={styles.value}>{displayAdvancePaid.toLocaleString()}</span>
                                    </div>
                                    <div className={styles.field}>
                                        <span className={styles.label}>Balance:</span>
                                        <span className={styles.value}>
                                            {remaining !== null ? remaining.toLocaleString() : '-'}
                                        </span>
                                    </div>
                                    <div className={styles.field}>
                                        <span className={styles.label}>Registration Fees:</span>
                                        <span className={styles.value}>
                                            {booking.registrationFee ? booking.registrationFee.toLocaleString() : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.urduSection}>
                                    <div className={styles.urduBox}>
                                        <p className={styles.urduText}>نوٹ:</p>
                                        <p className={styles.urduText}>یہ رسید صرف بکنگ کی تصدیق کیلئے ہے۔</p>
                                        <p className={styles.urduText}>موٹر سائیکل کی ڈیلیوری باقی رقم کی</p>
                                        <p className={styles.urduText}>ادائیگی کے بعد دی جائے گی۔</p>
                                        <p className={styles.urduText}>بکنگ منسوخ ہونے پر ایڈوانس واپس نہیں ہوگا۔</p>
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
                                <div className={styles.signatureLine}></div>
                                <p>Customer Signature</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
