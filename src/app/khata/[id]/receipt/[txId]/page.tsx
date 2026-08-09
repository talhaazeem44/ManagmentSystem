'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import Loader from '@/components/Loader';
import styles from './receipt.module.css';

interface KhataItem {
    model: string;
    quantity: number;
    pricePerUnit: number;
    engineNumber?: string;
    chassisNumber?: string;
}

interface KhataTransaction {
    _id: string;
    date: string;
    type: 'STOCK_GIVEN' | 'PAYMENT';
    description: string;
    amount: number;
    items?: KhataItem[];
    note?: string;
}

interface KhataParty {
    _id: string;
    name: string;
    mobile?: string;
    address?: string;
    transactions: KhataTransaction[];
}

export default function KhataStockReceiptPage() {
    const params = useParams();
    const [party, setParty] = useState<KhataParty | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = params.id as string;
        if (!id) return;
        fetch(`/api/khata/${id}`)
            .then(r => r.ok ? r.json() : null)
            .then(setParty)
            .finally(() => setLoading(false));
    }, [params.id]);

    if (loading) return (
        <DashboardLayout>
            <Loader size={160} fullPage />
        </DashboardLayout>
    );

    const tx = party?.transactions.find(t => t._id === params.txId);

    if (!party || !tx || tx.type !== 'STOCK_GIVEN') {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Receipt not found.
                </div>
            </DashboardLayout>
        );
    }

    // Running balance across all transactions up to and including this one, chronologically
    const sorted = [...party.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    for (const t of sorted) {
        balance += t.type === 'STOCK_GIVEN' ? t.amount : -t.amount;
        if (t._id === tx._id) break;
    }

    const items = tx.items || [];
    const itemsTotal = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
    const otherAmount = tx.amount - itemsTotal;

    return (
        <DashboardLayout>
            <div className={styles.noPrint} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Stock Receipt</h1>
                <button onClick={() => window.print()} className="btn btn-primary">🖨️ Print / Save as PDF</button>
            </div>

            <div className={styles.printArea}>
                <div className={styles.receipt}>
                    <div className={styles.topBar}>
                        <Image src="/honda-logo.png" alt="Honda" width={130} height={90} className={styles.hondaLogo} priority />
                        <div className={styles.titleBox}>
                            <h1>SALE RECEIPT</h1>
                            <span>Stock Given to Dealer</span>
                        </div>
                        <div className={styles.badgeArea}>
                            <div className={styles.badgeCircle}>3S</div>
                            <div className={styles.badgeText}>SALES<br />SERVICE<br />SPARE PARTS</div>
                        </div>
                    </div>

                    <div className={styles.metaRow}>
                        <div>Receipt Date: <strong>{new Date(tx.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                        <div>Receipt No: <strong>{tx._id.slice(-8).toUpperCase()}</strong></div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.field}>
                            <span className={styles.label}>Dealer / Party:</span>
                            <span className={styles.value}>{party.name}</span>
                        </div>
                        {party.mobile && (
                            <div className={styles.field}>
                                <span className={styles.label}>Mobile #:</span>
                                <span className={styles.value}>{party.mobile}</span>
                            </div>
                        )}
                        {party.address && (
                            <div className={styles.field}>
                                <span className={styles.label}>Address:</span>
                                <span className={styles.value}>{party.address}</span>
                            </div>
                        )}
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Engine # / Chassis #</th>
                                <th className={styles.num}>Qty</th>
                                <th className={styles.num}>Price / Unit</th>
                                <th className={styles.num}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i}>
                                    <td>{item.model}</td>
                                    <td>{item.engineNumber ? `${item.engineNumber} / ${item.chassisNumber}` : '—'}</td>
                                    <td className={styles.num}>{item.quantity}</td>
                                    <td className={styles.num}>Rs. {item.pricePerUnit.toLocaleString()}</td>
                                    <td className={styles.num}>Rs. {(item.quantity * item.pricePerUnit).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {tx.note && <div className={styles.note}>Note: {tx.note}</div>}

                    <div className={styles.totalsBox}>
                        <div className={styles.totalsRow}>
                            <span>Bikes Total</span>
                            <strong>Rs. {itemsTotal.toLocaleString()}</strong>
                        </div>
                        {otherAmount > 0 && (
                            <div className={styles.totalsRow}>
                                <span>Other Charges</span>
                                <strong>Rs. {otherAmount.toLocaleString()}</strong>
                            </div>
                        )}
                        <div className={`${styles.totalsRow} ${styles.grand}`}>
                            <span>Total Amount</span>
                            <span>Rs. {tx.amount.toLocaleString()}</span>
                        </div>
                        <div className={styles.totalsRow}>
                            <span>Balance After This Entry</span>
                            <strong style={{ color: balance > 0 ? '#c00' : '#0a0' }}>Rs. {balance.toLocaleString()}</strong>
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
                            <p>Received By (Dealer Signature)</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
