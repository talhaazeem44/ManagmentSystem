'use client';

import React from 'react';

interface ServiceReceiptProps {
    service: {
        customerName: string;
        customerMobile?: string;
        bikeNumber?: string;
        serviceType: string;
        amount: number;
        date: string | Date;
        description?: string;
    };
}

const ServiceReceipt: React.FC<ServiceReceiptProps> = ({ service }) => {
    return (
        <div className="receipt-container print-only">
            <style jsx>{`
                .receipt-container {
                    width: 80mm;
                    padding: 5mm;
                    background: white;
                    color: black;
                    font-family: 'Courier New', Courier, monospace;
                    margin: 0 auto;
                }

                .header {
                    text-align: center;
                    border-bottom: 1px dashed black;
                    padding-bottom: 3mm;
                    margin-bottom: 3mm;
                }

                .title {
                    font-size: 16pt;
                    font-weight: 900;
                    margin-bottom: 1mm;
                }

                .subtitle {
                    font-size: 10pt;
                    font-weight: 700;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10pt;
                    margin-bottom: 1mm;
                }

                .service-details {
                    border-bottom: 1px dashed black;
                    padding: 3mm 0;
                    margin-bottom: 3mm;
                }

                .total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14pt;
                    font-weight: 900;
                    margin-top: 2mm;
                }

                .footer {
                    text-align: center;
                    font-size: 8pt;
                    margin-top: 5mm;
                    border-top: 1px dashed black;
                    padding-top: 2mm;
                }

                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    .receipt-container {
                        width: 80mm;
                        padding: 3mm;
                    }
                }
            `}</style>

            <div className="header">
                <div className="title">NAEEM AUTOS</div>
                <div className="subtitle">WORKSHOP BILL</div>
                <div style={{ fontSize: '8pt', marginTop: '1mm' }}>{new Date(service.date).toLocaleString()}</div>
            </div>

            <div className="info-section">
                <div className="info-row">
                    <span>Customer:</span>
                    <span style={{ fontWeight: 'bold' }}>{service.customerName}</span>
                </div>
                {service.customerMobile && (
                    <div className="info-row">
                        <span>Mobile:</span>
                        <span>{service.customerMobile}</span>
                    </div>
                )}
                {service.bikeNumber && (
                    <div className="info-row">
                        <span>Bike No:</span>
                        <span style={{ fontWeight: 'bold' }}>{service.bikeNumber}</span>
                    </div>
                )}
            </div>

            <div className="service-details">
                <div className="info-row" style={{ marginBottom: '2mm' }}>
                    <span style={{ fontWeight: 'bold' }}>{service.serviceType}</span>
                    <span>Rs. {service.amount.toLocaleString()}</span>
                </div>
                {service.description && (
                    <div style={{ fontSize: '9pt', fontStyle: 'italic', color: '#444' }}>
                        * {service.description}
                    </div>
                )}
            </div>

            <div className="total-row">
                <span>TOTAL:</span>
                <span>Rs. {service.amount.toLocaleString()}</span>
            </div>

            <div className="footer">
                <div>Thank you for choosing Naeem Autos!</div>
                <div>Software by Atlas Honda Dealer Management</div>
            </div>
        </div>
    );
};

export default ServiceReceipt;
