'use client';

import React, { useRef } from 'react';

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
    const total      = service.totalAmount ?? service.amount ?? 0;
    const labour     = service.serviceCharges ?? service.amount ?? 0;
    const items      = service.items ?? [];
    const partsTotal = items.reduce((s, i) => s + i.customerPrice * i.quantity, 0);
    const receiptRef = useRef<HTMLDivElement>(null);

    const dateStr = new Date(service.date).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const handlePrint = () => {
        const content = receiptRef.current;
        if (!content) return;

        const win = window.open('', '_blank', 'width=320,height=700,toolbar=0,menubar=0,scrollbars=1');
        if (!win) { alert('Allow popups to print receipts.'); return; }

        win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
@page { size:80mm auto; margin:1mm; }
html,body {
    width:78mm;
    font-family:'Courier New',Courier,monospace;
    font-size:8pt;
    color:#000;
    background:#fff;
    line-height:1.4;
}
</style>
</head>
<body>${content.innerHTML}</body>
</html>`);
        win.document.close();

        const img = win.document.querySelector('img');
        const doPrint = () => { win.focus(); win.print(); };
        if (img && !img.complete) {
            const t = setTimeout(doPrint, 2500);
            img.onload  = () => { clearTimeout(t); setTimeout(doPrint, 150); };
            img.onerror = () => { clearTimeout(t); setTimeout(doPrint, 150); };
        } else {
            setTimeout(doPrint, 400);
        }
    };

    /* ── inline styles for the receipt body (used both on screen and in print) ── */
    const s: Record<string, React.CSSProperties> = {
        // width:100% (not a fixed px value) so this always exactly fills whatever
        // container it's placed in — the print window's body is set to 78mm, and a
        // hardcoded px width here previously worked out to ~80mm, overflowing the
        // printable area by ~2mm and clipping the right edge on real 80mm paper.
        wrap:    { fontFamily: "'Courier New', Courier, monospace", fontSize: '8pt', color: '#000', background: '#fff', width: '100%', boxSizing: 'border-box', lineHeight: 1.4, padding: '6px 4px' },
        center:  { textAlign: 'center' },
        shopName:{ fontSize: '13pt', fontWeight: 900 },
        sub:     { fontSize: '7.5pt', fontWeight: 700 },
        small:   { fontSize: '7pt' },
        divider: { borderTop: '1px dashed #000', margin: '3px 0' },
        row:     { display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px', fontSize: '8pt' },
        bold:    { fontWeight: 900 },
        totalRow:{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', fontWeight: 900, margin: '3px 0' },
        secTitle:{ fontSize: '7.5pt', fontWeight: 900, marginBottom: '2px', textTransform: 'uppercase' as const },
    };

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '12px',
            }}>
                {/* Receipt preview — fixed width here is purely for on-screen display;
                    the print window sizes the same content to the real 78mm printable area. */}
                <div style={{ background: '#fff', borderRadius: '6px', width: '320px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                    {/* The receipt content — this exact HTML is copied into the print window */}
                    <div ref={receiptRef} style={s.wrap}>
                        <div style={s.center}>
                            <div style={s.shopName}>NAEEM AUTOS</div>
                            <div style={s.sub}>Honda Authorized Dealer</div>
                            <div style={s.small}>JOB CARD</div>
                            <div style={s.small}>{dateStr}</div>
                        </div>

                        <div style={s.divider} />

                        <div style={s.row}><span>Customer:</span><span style={s.bold}>{service.customerName}</span></div>
                        {service.customerMobile && <div style={s.row}><span>Mobile:</span><span>{service.customerMobile}</span></div>}
                        {service.bikeNumber && <div style={s.row}><span>Bike No:</span><span style={s.bold}>{service.bikeNumber}</span></div>}

                        <div style={s.divider} />

                        <div style={s.row}>
                            <span style={s.bold}>{service.serviceType}</span>
                            <span>Rs.{labour.toLocaleString()}</span>
                        </div>
                        {service.description && (
                            <div style={{ fontSize: '7pt', fontStyle: 'italic', marginTop: '1px' }}>Note: {service.description}</div>
                        )}

                        {items.length > 0 && (
                            <>
                                <div style={s.divider} />
                                <div style={s.secTitle}>Parts &amp; Items</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', width: '55%', borderBottom: '1px solid #000', padding: '1px 0', fontWeight: 700 }}>Item</th>
                                            <th style={{ textAlign: 'center', width: '10%', borderBottom: '1px solid #000', padding: '1px 0', fontWeight: 700 }}>Qty</th>
                                            <th style={{ textAlign: 'right', width: '35%', borderBottom: '1px solid #000', padding: '1px 0', fontWeight: 700 }}>Amt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td style={{ textAlign: 'left', verticalAlign: 'top', padding: '1px 0' }}>
                                                    <div>{it.name}</div>
                                                    {it.productCode && <div style={{ fontSize: '6pt', color: '#555' }}>{it.productCode}</div>}
                                                </td>
                                                <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '1px 0' }}>{it.quantity}</td>
                                                <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '1px 0' }}>Rs.{(it.customerPrice * it.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ ...s.divider, borderStyle: 'dotted' }} />
                                <div style={s.row}><span>Labour</span><span>Rs.{labour.toLocaleString()}</span></div>
                                <div style={s.row}><span>Parts</span><span>Rs.{partsTotal.toLocaleString()}</span></div>
                            </>
                        )}

                        <div style={s.divider} />
                        <div style={s.totalRow}><span>TOTAL:</span><span>Rs.{total.toLocaleString()}</span></div>
                        <div style={s.divider} />

                        <div style={{ ...s.center, fontSize: '7pt' }}>
                            <div>Thank you for visiting Naeem Autos!</div>
                            <div>Honda Authorized Dealer</div>
                        </div>

                    </div>
                </div>

                {/* Tip + buttons */}
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', maxWidth: '300px', textAlign: 'center' }}>
                    <div style={{ color: '#facc15', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                        ⚠ Printer Setup
                    </div>
                    <div style={{ color: '#ddd', fontSize: '0.72rem', lineHeight: 1.5 }}>
                        In the print dialog: select <strong style={{ color: '#fff' }}>BlackCopper</strong> printer → More settings → Paper size → <strong style={{ color: '#fff' }}>80mm</strong> (or Thermal Roll)
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handlePrint}
                        style={{ padding: '10px 28px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
                        🖨️ Print
                    </button>
                    <button
                        onClick={() => onDone?.()}
                        style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '0.95rem', cursor: 'pointer' }}>
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default ServiceReceipt;
