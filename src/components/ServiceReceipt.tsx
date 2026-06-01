'use client';

import React, { useEffect } from 'react';

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
        amount?: number;
    };
    onDone?: () => void;
}

const ServiceReceipt: React.FC<ServiceReceiptProps> = ({ service, onDone }) => {
    const total = service.totalAmount ?? service.amount ?? 0;
    const serviceCharges = service.serviceCharges ?? service.amount ?? 0;
    const items = service.items ?? [];

    // Randomly pick a prize code (weighted)
    const prizes = [
        { code: 'T', weight: 20 }, // Free Tuning

        { code: 'R', weight: 45 }, // Try Again
    ];
    const total_weight = prizes.reduce((s, p) => s + p.weight, 0);
    let rand = Math.floor(Math.random() * total_weight);
    let prizeCode = 'R';
    for (const p of prizes) { if (rand < p.weight) { prizeCode = p.code; break; } rand -= p.weight; }
    const scratchUrl = `${window.location.origin}/scratch?p=${prizeCode}`;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(scratchUrl)}`;

    const receiptHTML = `
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                @page { size: 80mm auto; margin: 0; }
                body {
                    width: 76mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 10pt;
                    color: #000;
                    background: #fff;
                    padding: 3mm 2mm;
                    line-height: 1.4;
                }
                .center { text-align: center; }
                .bold { font-weight: 900; }
                .divider { border-top: 1px dashed #000; margin: 2mm 0; }
                .row { display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 1mm; }
                .title { font-size: 15pt; font-weight: 900; letter-spacing: 1px; }
                .subtitle { font-size: 9pt; font-weight: 700; }
                .total-row { display: flex; justify-content: space-between; font-size: 13pt; font-weight: 900; margin: 2mm 0; }
                table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
                th { border-bottom: 1px solid #000; font-weight: 700; padding: 0.5mm 0; text-align: left; }
                td { padding: 0.5mm 0; }
                .r { text-align: right; }
                .c { text-align: center; }
                .footer { text-align: center; font-size: 8pt; margin-top: 2mm; }
                .scratch-section {
                    margin-top: 4mm;
                    border: 2px dashed #000;
                    border-radius: 4px;
                    padding: 2mm;
                    text-align: center;
                }
                .scratch-title { font-size: 9pt; font-weight: 900; letter-spacing: 1px; margin-bottom: 1mm; }
                .scratch-box {
                    background: #000;
                    color: #000;
                    border-radius: 3px;
                    padding: 2mm 3mm;
                    margin: 1.5mm auto;
                    font-size: 10pt;
                    font-weight: 900;
                    letter-spacing: 2px;
                    width: 90%;
                    position: relative;
                }
                .scratch-hint { font-size: 7.5pt; color: #444; margin-top: 1mm; }
                .scratch-footer { font-size: 7pt; margin-top: 1mm; }
            </style>
        </head>
        <body>
            <div class="center">
                <div class="title">NAEEM AUTOS</div>
                <div class="subtitle">JOB CARD</div>
                <div style="font-size:8pt;margin-top:1mm">${new Date(service.date).toLocaleString('en-PK')}</div>
            </div>
            <div class="divider"></div>
            <div class="row"><span>Customer:</span><span class="bold">${service.customerName}</span></div>
            ${service.customerMobile ? `<div class="row"><span>Mobile:</span><span>${service.customerMobile}</span></div>` : ''}
            ${service.bikeNumber ? `<div class="row"><span>Bike No:</span><span class="bold">${service.bikeNumber}</span></div>` : ''}
            <div class="divider"></div>
            <div class="row"><span class="bold">${service.serviceType}</span><span>Rs. ${serviceCharges.toLocaleString()}</span></div>
            ${service.description ? `<div style="font-size:8pt;font-style:italic">Note: ${service.description}</div>` : ''}
            ${items.length > 0 ? `
            <div class="divider"></div>
            <div class="bold" style="font-size:9pt;margin-bottom:1mm">PARTS & ITEMS</div>
            <table>
                <thead><tr><th style="width:55%">Item</th><th class="c" style="width:10%">Qty</th><th class="r" style="width:15%">Rate</th><th class="r" style="width:20%">Amt</th></tr></thead>
                <tbody>
                    ${items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td class="c">${item.quantity}</td>
                        <td class="r">${item.customerPrice.toLocaleString()}</td>
                        <td class="r">${(item.customerPrice * item.quantity).toLocaleString()}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="row" style="font-size:8.5pt">
                <span style="color:#555">Labour</span><span>Rs. ${serviceCharges.toLocaleString()}</span>
            </div>
            <div class="row" style="font-size:8.5pt">
                <span style="color:#555">Parts</span><span>Rs. ${items.reduce((s, i) => s + i.customerPrice * i.quantity, 0).toLocaleString()}</span>
            </div>` : ''}
            <div class="divider"></div>
            <div class="total-row"><span>TOTAL:</span><span>Rs. ${total.toLocaleString()}</span></div>
            <div class="divider"></div>
            <div class="footer">
                <div>Thank you for choosing Naeem Autos!</div>
                <div>Honda Authorized Dealer</div>
            </div>

            <div class="scratch-section">
                <div class="scratch-title">★ LUCKY SCRATCH CARD ★</div>
                <div class="scratch-hint">Scan QR with your phone to reveal prize!</div>
                <div style="text-align:center;margin:2mm 0">
                    <img src="${qrUrl}" width="110" height="110" style="display:block;margin:0 auto" />
                </div>
                <div class="scratch-hint">Scratch on your screen to reveal your reward</div>
                <div class="scratch-footer">Valid 30 days | One per customer</div>
            </div>
        </body>
        </html>
    `;

    useEffect(() => {
        const win = window.open('', '_blank', 'width=400,height=600');
        if (!win) { alert('Please allow popups for this site to print receipts.'); onDone?.(); return; }
        win.document.write(receiptHTML);
        win.document.close();
        setTimeout(() => {
            win.focus();
            win.print();
        }, 500);
        onDone?.();
    }, []);

    return null;
};

export default ServiceReceipt;
