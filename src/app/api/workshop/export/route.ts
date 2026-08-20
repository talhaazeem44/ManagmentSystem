import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ServiceSale } from '@/models';

const HEADERS = [
    'Sno', 'CHASSIS_NO', 'REGISTRATION_NO', 'NAME', 'CONTACT', 'KM_READING',
    'VISIT_TYPE', 'JOB_STATUS', 'PAYMENT_STATUS', 'JOB_TYPE', 'NAME/CODE', 'QTY', 'CHARGES', 'TOTAL',
];

function csvCell(value: unknown): string {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        const filter: any = {};
        if (startDateStr && endDateStr) {
            filter.date = { $gte: new Date(startDateStr), $lt: new Date(endDateStr) };
        }

        const sales = await ServiceSale.find(filter).sort({ date: 1 }).lean();

        const rows: string[][] = [];
        let sno = 1;
        for (const r of sales as any[]) {
            const jobInfo = [
                '', // CHASSIS_NO — not tracked yet
                r.bikeNumber || '',
                r.customerName || '',
                r.customerMobile || '',
                '', // KM_READING — not tracked yet
                '', // VISIT_TYPE — not tracked yet
                '', // JOB_STATUS — not tracked yet
                '', // PAYMENT_STATUS — not tracked yet
                r.serviceType || '',
            ];

            // One row per visit — labour + every part combined, so a customer with
            // multiple items (e.g. Tuning + oil + air filter) reads as a single line.
            const items = r.items || [];
            const names = [
                ...(r.serviceCharges ? ['Labour'] : []),
                ...items.map((it: any) => it.name || ''),
            ];
            const qty = (r.serviceCharges ? 1 : 0) + items.reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);

            rows.push([
                String(sno++), ...jobInfo,
                names.join(', '),
                String(qty),
                String(r.serviceCharges || 0),
                String(r.totalAmount || 0),
            ]);
        }

        const csv = [HEADERS, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
        const bom = '﻿'; // Excel needs a BOM to render Rs./special characters correctly

        return new NextResponse(bom + csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="workshop-jobs-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
