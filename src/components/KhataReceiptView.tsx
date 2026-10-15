'use client';

import React, { forwardRef } from 'react';
import Image from 'next/image';
import styles from './KhataReceiptView.module.css';

export interface KhataReceiptItem {
    model: string;
    quantity: number;
    pricePerUnit: number;
    engineNumber?: string;
    chassisNumber?: string;
}

export interface KhataReceiptTx {
    _id: string;
    date: string | Date;
    type?: string;
    description?: string;
    amount: number;
    items?: KhataReceiptItem[];
    note?: string;
}

export interface KhataReceiptParty {
    _id?: string;
    name: string;
    mobile?: string;
    address?: string;
}

export interface KhataReceiptViewProps {
    party: KhataReceiptParty;
    tx: KhataReceiptTx;
    balance: number;
    className?: string;
}

export const KhataReceiptView = forwardRef<HTMLDivElement, KhataReceiptViewProps>(
    ({ party, tx, balance, className }, ref) => {
        const items = tx.items || [];
        const itemsTotal = items.reduce(
            (s, i) => s + (Number(i.quantity) || 0) * (Number(i.pricePerUnit) || 0),
            0
        );
        const otherAmount = Math.max(0, tx.amount - itemsTotal);

        return (
            <div ref={ref} className={`${styles.receipt} ${className || ''}`}>
                <div className={styles.topBar}>
                    <Image
                        src="/honda-logo.png"
                        alt="Honda"
                        width={100}
                        height={100}
                        className={styles.hondaLogo}
                        priority
                    />
                    <div className={styles.titleBox}>
                        <h1>SALE RECEIPT</h1>
                        <span>Stock Given to Dealer</span>
                    </div>
                    <div className={styles.badgeArea}>
                        <div className={styles.badgeCircle}>3S</div>
                        <div className={styles.badgeText}>
                            SALES
                            <br />
                            SERVICE
                            <br />
                            SPARE PARTS
                        </div>
                    </div>
                </div>

                <div className={styles.metaRow}>
                    <div>
                        Receipt Date:{' '}
                        <strong>
                            {new Date(tx.date).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </strong>
                    </div>
                    <div>
                        Receipt No:{' '}
                        <strong>{tx._id ? tx._id.slice(-8).toUpperCase() : 'NEW'}</strong>
                    </div>
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
                        {items.length > 0 ? (
                            items.map((item, i) => (
                                <tr key={i}>
                                    <td>{item.model}</td>
                                    <td>
                                        {item.engineNumber
                                            ? `${item.engineNumber} / ${item.chassisNumber || '—'}`
                                            : '—'}
                                    </td>
                                    <td className={styles.num}>{item.quantity}</td>
                                    <td className={styles.num}>
                                        Rs. {Number(item.pricePerUnit).toLocaleString()}
                                    </td>
                                    <td className={styles.num}>
                                        Rs. {(item.quantity * item.pricePerUnit).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={2}>{tx.description || 'Stock Given'}</td>
                                <td className={styles.num}>1</td>
                                <td className={styles.num}>Rs. {tx.amount.toLocaleString()}</td>
                                <td className={styles.num}>Rs. {tx.amount.toLocaleString()}</td>
                            </tr>
                        )}
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
                        <strong style={{ color: balance > 0 ? '#c00' : '#0a0' }}>
                            Rs. {balance.toLocaleString()}
                        </strong>
                    </div>
                </div>

                <div className={styles.footer}>
                    <div className={styles.dealerInfo}>
                        <p>📞 Ph: 052-6525001-2 Cell: 0331-8800216, 0334-8179775</p>
                    </div>
                    <div className={styles.signature}>
                        <div className={styles.signatureLine} />
                        <p>Received By (Dealer Signature)</p>
                    </div>
                </div>
            </div>
        );
    }
);

KhataReceiptView.displayName = 'KhataReceiptView';
export default KhataReceiptView;
