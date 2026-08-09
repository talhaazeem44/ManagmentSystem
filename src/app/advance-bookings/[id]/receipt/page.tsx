'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './receipt.module.css';

interface Booking {
    _id: string;
    customerName: string;
    customerMobile?: string;
    cnic?: string;
    bikeModel?: string;
    bikeColor?: string;
    advancePaid: number;
    totalPrice?: number;
    registrationFee?: number;
    margin?: number;
    notes?: string;
    status: 'PENDING' | 'DELIVERED';
    date: string;
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

    const remaining = booking.totalPrice ? booking.totalPrice - booking.advancePaid : null;

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
            const fileName = `Advance-Receipt-${(booking.customerName || 'Customer').replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        } finally {
            setExporting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Advance Booking Receipt</h1>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button onClick={handleExportPDF} disabled={exporting} className="btn btn-secondary">
                            {exporting ? '⏳ Generating...' : '📄 Export PDF'}
                        </button>
                        <button onClick={() => window.print()} className="btn btn-primary">
                            🖨️ Print Receipt
                        </button>
                    </div>
                </div>

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
                            <span className={styles.label}>Customer's Name:</span>
                            <span className={styles.value}>{booking.customerName}</span>
                        </div>

                        <div className={styles.field}>
                            <span className={styles.label}>Mobile #:</span>
                            <span className={styles.value}>{booking.customerMobile || '-'}</span>
                        </div>

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
                    </div>

                    <div className={styles.section}>
                        <div className={styles.paymentDetails}>
                            <div className={styles.paymentCol}>
                                <div className={styles.field}>
                                    <span className={styles.label}>Total Price:</span>
                                    <span className={styles.value}>
                                        {booking.totalPrice ? booking.totalPrice.toLocaleString() : '-'}
                                    </span>
                                </div>
                                <div className={styles.field}>
                                    <span className={styles.label}>Advance Amount:</span>
                                    <span className={styles.value}>{booking.advancePaid.toLocaleString()}</span>
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
            </div>
        </DashboardLayout>
    );
}
