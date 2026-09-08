#!/usr/bin/env node
/**
 * FBR sandbox scenario testing — clears the scenarios IRIS assigns to
 * NAEEM AUTOS (Retailer / All Other Sectors) so the production token unlocks.
 *
 *   node scripts/fbr-scenarios.mjs           # dry run — validates, creates no IRN
 *   node scripts/fbr-scenarios.mjs --post    # real submit — this is what clears them
 *
 * Every payload below was validated live against validateinvoicedata_sb.
 * Reference values came from the DI reference APIs, not guesswork:
 *   transTypeId 75/24/23, rates via SaleTypeToRate (Punjab = province 7),
 *   UoM via HS_UOM for 8711.2090, SRO via SroSchedule + SROItem.
 */
import fs from 'node:fs';

for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const token = process.env.FBR_SANDBOX_TOKEN;
if (!token) {
    console.error('✗ FBR_SANDBOX_TOKEN is empty — get it from IRIS and put it in .env');
    process.exit(1);
}

const post = process.argv.includes('--post');
const endpoint = post ? 'postinvoicedata_sb' : 'validateinvoicedata_sb';
const today = new Date().toISOString().slice(0, 10);

/** FBR sometimes returns JSON with a trailing comma — see src/lib/fbr.ts */
const parse = (t) => {
    try { return JSON.parse(t); } catch {
        try { return JSON.parse(t.replace(/,(\s*[}\]])/g, '$1')); } catch { return { raw: t }; }
    }
};

const seller = {
    sellerNTNCNIC: process.env.FBR_SELLER_NTNCNIC,
    sellerBusinessName: process.env.FBR_SELLER_BUSINESS_NAME,
    sellerProvince: process.env.FBR_SELLER_PROVINCE || 'Punjab',
    sellerAddress: process.env.FBR_SELLER_ADDRESS,
};

const UOM = 'Numbers, pieces, units';   // the only UoM allowed for 8711.2090
const HS = '8711.2090';

const item = (o) => ({
    hsCode: HS,
    productDescription: o.desc,
    rate: o.rate,
    uoM: UOM,
    quantity: 1,
    totalValues: o.net + o.tax,
    valueSalesExcludingST: o.net,
    fixedNotifiedValueOrRetailPrice: o.retail ?? 0,
    salesTaxApplicable: o.tax,
    salesTaxWithheldAtSource: 0,
    extraTax: '',
    furtherTax: 0,
    sroScheduleNo: o.sro ?? '',
    fedPayable: 0,
    discount: 0,
    saleType: o.saleType,
    sroItemSerialNo: o.sroItem ?? '',
});

// SN001 needs a buyer FBR actually considers registered. 0786909 returns
// "Registered" from dist/v1/Get_Reg_Type — an unregistered CNIC gets rejected.
const buyerRegistered = {
    buyerNTNCNIC: '0786909',
    buyerBusinessName: 'FERTILIZER MANUFAC IRS NEW',
    buyerProvince: 'Punjab',
    buyerAddress: 'Lahore',
    buyerRegistrationType: 'Registered',
};

const buyerWalkIn = {
    buyerNTNCNIC: '3520261846475',
    buyerBusinessName: 'Walk-in Customer',
    buyerProvince: 'Punjab',
    buyerAddress: 'Sambrial',
    buyerRegistrationType: 'Unregistered',
};

const SCENARIOS = {
    // Goods at standard rate to registered buyers
    SN001: {
        ...buyerRegistered,
        items: [item({ desc: 'Honda CD70 motorcycle', rate: '18%', net: 100000, tax: 18000, saleType: 'Goods at standard rate (default)' })],
    },
    // Sale of 3rd schedule goods — tax is charged on the printed retail price,
    // so fixedNotifiedValueOrRetailPrice must be set or FBR raises 0102.
    SN008: {
        ...buyerWalkIn,
        items: [item({ desc: '3rd schedule item', rate: '18%', net: 150000, tax: 27000, retail: 150000, saleType: '3rd Schedule Goods' })],
    },
    // Sale to End Consumer by retailers — standard rate. This is the one that
    // matches what the shop actually does every day.
    SN026: {
        ...buyerWalkIn,
        items: [item({ desc: 'Honda CD70 motorcycle', rate: '18%', net: 100000, tax: 18000, saleType: 'Goods at standard rate (default)' })],
    },
    // Sale to End Consumer by retailers — 3rd schedule goods
    SN027: {
        ...buyerWalkIn,
        items: [item({ desc: '3rd schedule item', rate: '18%', net: 150000, tax: 27000, retail: 150000, saleType: '3rd Schedule Goods' })],
    },
    // Sale to End Consumer by retailers — reduced rate. Any rate other than 18%
    // makes SRO/Schedule No mandatory (error 0077).
    SN028: {
        ...buyerWalkIn,
        items: [item({
            desc: 'Reduced rate item', rate: '10%', net: 100000, tax: 10000,
            saleType: 'Goods at Reduced Rate', sro: 'EIGHTH SCHEDULE Table 1', sroItem: '1',
        })],
    },
};

console.log(`Mode: ${post ? 'POST (creates real sandbox IRNs)' : 'VALIDATE (dry run)'}\n`);

let failed = 0;
for (const [sn, body] of Object.entries(SCENARIOS)) {
    const payload = { invoiceType: 'Sale Invoice', invoiceDate: today, ...seller, invoiceRefNo: '', scenarioId: sn, ...body };

    const res = await fetch(`https://gw.fbr.gov.pk/di_data/v1/di/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    });

    const b = parse(await res.text());
    const v = b.validationResponse;
    const ok = v?.status === 'Valid';
    if (!ok) failed++;

    const reason = v?.error
        || v?.invoiceStatuses?.find(i => i.error)?.error
        || (b.raw ? String(b.raw).slice(0, 200) : '');
    const code = v?.errorCode || v?.invoiceStatuses?.find(i => i.error)?.errorCode;

    console.log(
        `${ok ? '✓' : '✗'} ${sn}  ${String(v?.status || `HTTP ${res.status}`).padEnd(8)}` +
        `${b.invoiceNumber ? ` IRN: ${b.invoiceNumber}` : ''}` +
        `${reason ? `  ${code ? `[${code}] ` : ''}${reason}` : ''}`
    );
}

console.log(
    failed
        ? `\n${failed} scenario(s) rejected — fix these before running with --post.`
        : post
            ? '\nAll scenarios submitted. Check IRIS — they should flip from Pending to Completed.'
            : '\nAll scenarios valid. Re-run with --post to actually clear them in IRIS.'
);
