'use client';

import React from 'react';

interface BillItem {
    name: string;
    quantity: number;
    customerPrice: number;
}

interface ServiceReceiptProps {
    service: {
        customerName: string;
        customerMobile?: string;
        bikeNumber?: string;
        serviceType: string;
        date: string | Date;
        description?: string;
        serviceCharges?: number;
        items?: BillItem[];
        totalAmount?: number;
        // legacy support
        amount?: number;
    };
}

const ServiceReceipt: React.FC<ServiceReceiptProps> = ({ service }) => {
    const total = service.totalAmount ?? service.amount ?? 0;
    const serviceCharges = service.serviceCharges ?? service.amount ?? 0;
    const items = service.items ?? [];

    return (
        <div className="print-only">
            <style>{`
                .thermal-receipt {
                    width: 72mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 10pt;
                    color: #000;
                    background: #fff;
                    padding: 3mm 2mm;
                    line-height: 1.4;
                }
                .t-center { text-align: center; }
                .t-right { text-align: right; }
                .t-bold { font-weight: 900; }
                .t-divider { border-top: 1px dashed #000; margin: 2mm 0; }
                .t-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9.5pt;
                    margin-bottom: 1mm;
                }
                .t-title { font-size: 15pt; font-weight: 900; letter-spacing: 1px; }
                .t-subtitle { font-size: 9pt; font-weight: 700; }
                .t-total {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13pt;
                    font-weight: 900;
                    margin: 2mm 0;
                }
                .t-items td, .t-items th {
                    font-size: 8.5pt;
                    padding: 0.5mm 0;
                    vertical-align: top;
                }
                .t-items { width: 100%; border-collapse: collapse; }
                .t-items th { border-bottom: 1px solid #000; font-weight: 700; }
                .t-items .col-name { width: 55%; }
                .t-items .col-qty  { width: 10%; text-align: center; }
                .t-items .col-rate { width: 15%; text-align: right; }
                .t-items .col-amt  { width: 20%; text-align: right; }
            `}</style>

            <div className="thermal-receipt">
                {/* Header */}
                <div className="t-center">
                    <div className="t-title">NAEEM AUTOS</div>
                    <div className="t-subtitle">WORKSHOP SERVICE BILL</div>
                    <div style={{ fontSize: '8pt', marginTop: '1mm' }}>
                        {new Date(service.date).toLocaleString('en-PK')}
                    </div>
                </div>

                <div className="t-divider" />

                {/* Customer Info */}
                <div className="t-row">
                    <span>Customer:</span>
                    <span className="t-bold">{service.customerName}</span>
                </div>
                {service.customerMobile && (
                    <div className="t-row">
                        <span>Mobile:</span>
                        <span>{service.customerMobile}</span>
                    </div>
                )}
                {service.bikeNumber && (
                    <div className="t-row">
                        <span>Bike No:</span>
                        <span className="t-bold">{service.bikeNumber}</span>
                    </div>
                )}

                <div className="t-divider" />

                {/* Service */}
                <div className="t-row">
                    <span className="t-bold">{service.serviceType}</span>
                    <span>Rs. {serviceCharges.toLocaleString()}</span>
                </div>
                {service.description && (
                    <div style={{ fontSize: '8pt', fontStyle: 'italic', marginBottom: '1mm' }}>
                        Note: {service.description}
                    </div>
                )}

                {/* Parts */}
                {items.length > 0 && (
                    <>
                        <div className="t-divider" />
                        <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '1mm' }}>PARTS & ITEMS</div>
                        <table className="t-items">
                            <thead>
                                <tr>
                                    <th className="col-name">Item</th>
                                    <th className="col-qty">Qty</th>
                                    <th className="col-rate">Rate</th>
                                    <th className="col-amt">Amt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="col-name">{item.name}</td>
                                        <td className="col-qty">{item.quantity}</td>
                                        <td className="col-rate">{item.customerPrice.toLocaleString()}</td>
                                        <td className="col-amt">{(item.customerPrice * item.quantity).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                <div className="t-divider" />

                {/* Total */}
                <div className="t-total">
                    <span>TOTAL:</span>
                    <span>Rs. {total.toLocaleString()}</span>
                </div>

                <div className="t-divider" />

                {/* Footer */}
                <div className="t-center" style={{ fontSize: '8pt', marginTop: '2mm' }}>
                    <div>Thank you for choosing Naeem Autos!</div>
                    <div>Honda Authorized Dealer</div>
                    <div style={{ marginTop: '1mm' }}>★★★★★</div>
                </div>

                {/* Feed space for cutter */}
                <div style={{ marginTop: '20mm' }}></div>
            </div>
        </div>
    );
};

export default ServiceReceipt;
