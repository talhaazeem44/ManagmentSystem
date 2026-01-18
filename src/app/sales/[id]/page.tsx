'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './receipt.module.css';

interface Sale {
    id: number;
    saleDate: string;
    price: number;
    registrationCost: number | null;
    paymentMode: string;
    receiptNumber: string | null;
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder: {
            doNumber: string;
        };
    };
    customer: {
        name: string;
        cnic: string;
        fatherName: string | null;
        address: string | null;
        mobile: string | null;
    };
}

export default function ReceiptPage() {
    const params = useParams();
    const [sale, setSale] = useState<Sale | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchSale(params.id as string);
        }
    }, [params.id]);

    const fetchSale = async (id: string) => {
        try {
            const response = await fetch(`/api/sales/${id}`);
            if (response.ok) {
                const data = await response.json();
                setSale(data);
            }
        } catch (error) {
            console.error('Failed to fetch sale:', error);
        } finally {
            setLoading(false);
        }
    };

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

    if (!sale) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</p>
                    <p style={{ color: 'var(--color-text-muted)' }}>Sale not found</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Sale Receipt</h1>
                    <button onClick={() => window.print()} className="btn btn-primary">
                        🖨️ Print Receipt
                    </button>
                </div>

                <div className={styles.receipt}>
                    <div className={styles.header}>
                        <div className={styles.logo}>🏍️ HONDA</div>
                        <div className={styles.receiptTitle}>SALE RECEIPT</div>
                        <div className={styles.receiptNumber}>
                            {sale.receiptNumber || `#${sale.id}`}
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
                                <label className={sale.bike.model === 'CD70' ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model === 'CD70'} readOnly /> CD70
                                </label>
                                <label className={sale.bike.model === 'DREAM' ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model === 'DREAM'} readOnly /> DREAM
                                </label>
                                <label className={sale.bike.model === 'PRIDOR' ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model === 'PRIDOR'} readOnly /> PRIDOR
                                </label>
                                <label className={sale.bike.model === 'CG 125' ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model === 'CG 125'} readOnly /> CG 125
                                </label>
                                <label className={sale.bike.model.includes('CG125') ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model.includes('CG125')} readOnly /> CG125S.SE
                                </label>
                                <label className={sale.bike.model.includes('CB125') ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model.includes('CB125')} readOnly /> CB125F.SE
                                </label>
                                <label className={sale.bike.model === 'CB150F' ? styles.checked : ''}>
                                    <input type="checkbox" checked={sale.bike.model === 'CB150F'} readOnly /> CB150F
                                </label>
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
                            <label className={sale.paymentMode === 'CASH' ? styles.checked : ''}>
                                <input type="checkbox" checked={sale.paymentMode === 'CASH'} readOnly /> CASH
                            </label>
                            <label className={sale.paymentMode === 'CREDIT' ? styles.checked : ''}>
                                <input type="checkbox" checked={sale.paymentMode === 'CREDIT'} readOnly /> CREDIT
                            </label>
                            <label className={sale.paymentMode === 'LEASE' ? styles.checked : ''}>
                                <input type="checkbox" checked={sale.paymentMode === 'LEASE'} readOnly /> LEASE
                            </label>
                        </div>

                        <div className={styles.field}>
                            <span className={styles.label}>Cash Price:</span>
                            <span className={styles.value}>{Number(sale.price).toLocaleString()} PKR</span>
                        </div>

                        <div className={styles.field}>
                            <span className={styles.label}>Registration Fees:</span>
                            <span className={styles.value}>
                                {sale.registrationCost ? `${Number(sale.registrationCost).toLocaleString()} PKR` : '-'}
                            </span>
                        </div>

                        <div className={styles.field}>
                            <span className={styles.label}>DO Number:</span>
                            <span className={styles.value}>{sale.bike.deliveryOrder.doNumber}</span>
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
