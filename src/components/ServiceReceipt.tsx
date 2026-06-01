'use client';

import React, { useEffect } from 'react';

interface BillItem {
    name: string;
    productCode?: string;
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
    const partsTotal = items.reduce((s, i) => s + i.customerPrice * i.quantity, 0);

    useEffect(() => {
        // Build prize code
        const prizes = [
            { code: 'T', weight: 20 },
            { code: 'R', weight: 45 },
        ];
        const total_weight = prizes.reduce((s, p) => s + p.weight, 0);
        let rand = Math.floor(Math.random() * total_weight);
        let prizeCode = 'R';
        for (const p of prizes) { if (rand < p.weight) { prizeCode = p.code; break; } rand -= p.weight; }

        const scratchUrl = `${window.location.origin}/scratch?p=${prizeCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(scratchUrl)}`;

        const dateStr = new Date(service.date).toLocaleString('en-PK', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });

        const itemsHtml = items.length > 0 ? `
            <div class="divider"></div>
            <div class="section-title">PARTS &amp; ITEMS</div>
            <table>
                <thead>
                    <tr>
                        <th style="width:52%;text-align:left">Item</th>
                        <th style="width:10%;text-align:center">Qty</th>
                        <th style="width:38%;text-align:right">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                    <tr>
                        <td style="text-align:left">
                            <div>${item.name}</div>
                            ${item.productCode ? `<div style="font-size:6.5pt;color:#555">${item.productCode}</div>` : ''}
                        </td>
                        <td style="text-align:center">${item.quantity}</td>
                        <td style="text-align:right">Rs.${(item.customerPrice * item.quantity).toLocaleString()}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="divider" style="border-style:dotted"></div>
            <div class="row"><span>Labour</span><span>Rs.${serviceCharges.toLocaleString()}</span></div>
            <div class="row"><span>Parts</span><span>Rs.${partsTotal.toLocaleString()}</span></div>
        ` : '';

        const receiptHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
@page {
    size: 58mm auto;
    margin: 2mm 1mm;
}
html, body {
    width: 56mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 8pt;
    color: #000;
    background: #fff;
    line-height: 1.35;
}
.center { text-align: center; }
.bold { font-weight: 900; }
.divider { border-top: 1px dashed #000; margin: 2mm 0; }
.row { display: flex; justify-content: space-between; margin-bottom: 0.8mm; font-size: 8pt; }
.shop-name { font-size: 13pt; font-weight: 900; letter-spacing: 0.5px; }
.shop-sub { font-size: 7.5pt; font-weight: 700; }
.section-title { font-size: 7.5pt; font-weight: 900; margin-bottom: 1mm; text-transform: uppercase; }
.total-row { display: flex; justify-content: space-between; font-size: 11pt; font-weight: 900; margin: 1.5mm 0; }
table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
th { border-bottom: 1px solid #000; font-weight: 700; padding: 0.5mm 0; }
td { padding: 0.4mm 0; vertical-align: top; }
.footer { text-align: center; font-size: 7pt; margin-top: 2mm; }
.scratch-section {
    margin-top: 3mm;
    border: 1.5px dashed #000;
    border-radius: 3px;
    padding: 2mm 1.5mm;
    text-align: center;
}
.scratch-title { font-size: 8pt; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 1mm; }
.scratch-hint { font-size: 6.5pt; color: #444; margin-top: 0.5mm; }
</style>
</head>
<body>
<div class="center">
    <div class="shop-name">NAEEM AUTOS</div>
    <div class="shop-sub">Honda Authorized Dealer</div>
    <div style="font-size:7pt;margin-top:0.5mm">JOB CARD</div>
    <div style="font-size:7pt;margin-top:0.5mm">${dateStr}</div>
</div>
<div class="divider"></div>
<div class="row"><span>Customer:</span><span class="bold">${service.customerName}</span></div>
${service.customerMobile ? `<div class="row"><span>Mobile:</span><span>${service.customerMobile}</span></div>` : ''}
${service.bikeNumber ? `<div class="row"><span>Bike No:</span><span class="bold">${service.bikeNumber}</span></div>` : ''}
<div class="divider"></div>
<div class="row"><span class="bold">${service.serviceType}</span><span>Rs.${serviceCharges.toLocaleString()}</span></div>
${service.description ? `<div style="font-size:7pt;font-style:italic;margin-top:0.5mm">Note: ${service.description}</div>` : ''}
${itemsHtml}
<div class="divider"></div>
<div class="total-row"><span>TOTAL:</span><span>Rs.${total.toLocaleString()}</span></div>
<div class="divider"></div>
<div class="footer">
    <div>Thank you for visiting Naeem Autos!</div>
    <div style="margin-top:0.5mm">Honda Authorized Dealer</div>
</div>
<div class="scratch-section">
    <div class="scratch-title">&#9733; LUCKY SCRATCH CARD &#9733;</div>
    <div class="scratch-hint">Scan QR with phone to reveal prize!</div>
    <div style="margin:1.5mm 0">
        <img src="${qrUrl}" width="90" height="90" style="display:block;margin:0 auto" />
    </div>
    <div class="scratch-hint">Valid 30 days &bull; One per customer</div>
</div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=300,height=500');
        if (!win) {
            alert('Please allow popups for this site to print receipts.');
            onDone?.();
            return;
        }
        win.document.write(receiptHTML);
        win.document.close();

        // Wait for QR image to load before printing
        const img = win.document.querySelector('img');
        if (img && !img.complete) {
            img.onload = () => setTimeout(() => { win.focus(); win.print(); }, 200);
            img.onerror = () => setTimeout(() => { win.focus(); win.print(); }, 200);
            setTimeout(() => { win.focus(); win.print(); }, 2000); // fallback
        } else {
            setTimeout(() => { win.focus(); win.print(); }, 600);
        }

        onDone?.();
    }, []);

    return null;
};

export default ServiceReceipt;
