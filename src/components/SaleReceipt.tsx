import React from 'react';

interface SaleReceiptProps {
    sale: {
        saleDate: string;
        price: number;
        advanceAmount: string;
        receivedCash: number;
        balance: number;
        registrationCost?: number;
        receiptNumber?: string;
        paymentMode: string;
        bike: {
            model: string;
            color: string;
            engineNumber: string;
            chassisNumber: string;
            deliveryOrder?: {
                date: string;
            }
        };
        customer: {
            name: string;
            fatherName: string;
            cnic: string;
            address: string;
            mobile: string;
        };
    };
}

const SaleReceipt: React.FC<SaleReceiptProps> = ({ sale }) => {
    return (
        <div className="receipt-container print-only">
            <style jsx>{`
                .receipt-container {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 0 auto;
                    background: white;
                    color: black;
                    font-family: 'Inter', system-ui, sans-serif;
                }

                @media print {
                    .print-only {
                        display: block !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .receipt-container, .receipt-container * {
                        visibility: visible;
                    }
                    .receipt-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        margin: 0;
                        padding: 10mm;
                    }
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid black;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }

                .logo-section h1 {
                    font-size: 24px;
                    font-weight: 800;
                    margin: 0;
                    letter-spacing: 2px;
                }

                .receipt-title {
                    text-align: center;
                    border: 1px solid black;
                    padding: 5px 20px;
                    font-weight: bold;
                    margin: 10px 0;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .info-item {
                    display: flex;
                    border-bottom: 1px dotted #ccc;
                    padding: 5px 0;
                }

                .info-label {
                    font-weight: 600;
                    width: 150px;
                    font-size: 0.9rem;
                }

                .info-value {
                    flex: 1;
                    font-size: 0.9rem;
                }

                .bike-specs {
                    border: 1px solid black;
                    padding: 15px;
                    margin-bottom: 20px;
                }

                .specs-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }

                .spec-box {
                    border: 1px solid #ddd;
                    padding: 5px;
                    text-align: center;
                    font-size: 0.8rem;
                }

                .spec-box.active {
                    background: #f0f0f0;
                    font-weight: bold;
                    border: 1px solid black;
                }

                .price-section {
                    margin-top: 20px;
                    border-top: 1px solid black;
                    padding-top: 10px;
                }

                .price-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 20px;
                    margin-bottom: 5px;
                }

                .price-label {
                    width: 150px;
                    text-align: right;
                }

                .price-value {
                    width: 120px;
                    border-bottom: 1px solid black;
                    text-align: right;
                    font-weight: bold;
                }

                .footer {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }

                .dealer-info {
                    font-size: 0.8rem;
                }

                .signature-box {
                    width: 200px;
                    border-top: 1px solid black;
                    text-align: center;
                    padding-top: 5px;
                    font-size: 0.9rem;
                }

                .urdu-note {
                    direction: rtl;
                    font-size: 0.9rem;
                    border: 1px solid black;
                    padding: 10px;
                    margin-top: 20px;
                    border-radius: 10px;
                    line-height: 1.6;
                }
            `}</style>

            <div className="header">
                <div className="logo-section">
                    <h1>HONDA</h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>3S SALES SERVICE SPARE PARTS</div>
                </div>
            </div>

            <div className="receipt-title">SALE RECEIPT</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div><strong>C.N.I.C #:</strong> {sale.customer.cnic}</div>
                <div><strong>Dated:</strong> {new Date(sale.saleDate).toLocaleDateString()}</div>
            </div>

            <div className="info-grid">
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="info-label">Customer's Name:</div>
                    <div className="info-value">{sale.customer.name}</div>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="info-label">Father/Husband Name:</div>
                    <div className="info-value">{sale.customer.fatherName}</div>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="info-label">Address:</div>
                    <div className="info-value">{sale.customer.address}</div>
                </div>
                <div className="info-item">
                    <div className="info-label">Mobile #:</div>
                    <div className="info-value">{sale.customer.mobile}</div>
                </div>
            </div>

            <div className="bike-specs">
                <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <strong>Honda:</strong>
                    <div className="specs-grid" style={{ flex: 1 }}>
                        {['CD70', 'DREAM', 'PRIDOR', 'CG 125', 'CG125S.SE', 'CB125F.SE', 'CB150F'].map(model => (
                            <div key={model} className={`spec-box ${sale.bike.model === model ? 'active' : ''}`}>
                                {model}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}><strong>Model:</strong> {new Date(sale.bike.deliveryOrder?.date || '').getFullYear() || '2026'}</div>
                    <div style={{ flex: 1 }}><strong>Colour:</strong> {sale.bike.color}</div>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1, border: '1px solid black', padding: '5px' }}><strong>Engine #:</strong> {sale.bike.engineNumber}</div>
                    <div style={{ flex: 1, border: '1px solid black', padding: '5px' }}><strong>Chassis #:</strong> {sale.bike.chassisNumber}</div>
                </div>
            </div>

            <div className="price-section">
                <div className="price-row">
                    <div className="price-label">Cash Price:</div>
                    <div className="price-value">{sale.price.toLocaleString()}</div>
                </div>
                <div className="price-row">
                    <div className="price-label">Advance Amount:</div>
                    <div className="price-value">{sale.advanceAmount || '0'}</div>
                </div>
                <div className="price-row">
                    <div className="price-label">Received Cash:</div>
                    <div className="price-value">{sale.receivedCash?.toLocaleString() || '0'}</div>
                </div>
                <div className="price-row">
                    <div className="price-label">Balance:</div>
                    <div className="price-value">{sale.balance?.toLocaleString() || '0'}</div>
                </div>
                {sale.registrationCost && (
                    <div className="price-row">
                        <div className="price-label">Registration Fees:</div>
                        <div className="price-value">{sale.registrationCost.toLocaleString()}</div>
                    </div>
                )}
            </div>

            <div className="urdu-note">
                نوٹ: یہ رسید رجسٹریشن کیلئے استعمال نہیں ہو سکتی۔ اصل کاغذات کے حصول کیلئے یہ رسید اور اصل شناختی کارڈ ضرور لائیں۔ نیز موٹر سائیکل کی تاریخ خرید اور گاہک کا نام تبدیل نہ ہوگا۔
            </div>

            <div className="footer">
                <div className="dealer-info">
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>NAEEM AUTOS</div>
                    <div>1.5 Km Daska Road, Sambrial</div>
                    <div>Ph: 052-6525001-2 Cell: 0331-8800216, 0334-8179775</div>
                </div>
                <div className="signature-box">
                    Customer Signature
                </div>
            </div>
        </div>
    );
};

export default SaleReceipt;
