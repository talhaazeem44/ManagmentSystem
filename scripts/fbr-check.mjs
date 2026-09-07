#!/usr/bin/env node
/**
 * Quick FBR connectivity + config check.
 *   node scripts/fbr-check.mjs
 * Reads .env, hits a reference endpoint, and prints what is still missing.
 */
import fs from 'node:fs';

for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const mode = process.env.FBR_MODE === 'production' ? 'production' : 'sandbox';
const token = mode === 'production' ? process.env.FBR_PROD_TOKEN : process.env.FBR_SANDBOX_TOKEN;

console.log(`Mode: ${mode}`);
for (const k of ['FBR_SELLER_NTNCNIC', 'FBR_SELLER_BUSINESS_NAME', 'FBR_SELLER_ADDRESS', 'FBR_SELLER_PROVINCE']) {
    console.log(`${process.env[k] ? '✓' : '✗'} ${k}${process.env[k] ? `: ${process.env[k]}` : ' — MISSING'}`);
}

if (!token) {
    console.error(`\n✗ ${mode === 'production' ? 'FBR_PROD_TOKEN' : 'FBR_SANDBOX_TOKEN'} is empty. Get it from IRIS and put it in .env.`);
    process.exit(1);
}

const res = await fetch('https://gw.fbr.gov.pk/pdi/v1/provinces', {
    headers: { Authorization: `Bearer ${token}` },
});
const body = await res.text();
if (!res.ok) {
    console.error(`\n✗ FBR returned ${res.status}: ${body.slice(0, 300)}`);
    process.exit(1);
}
console.log(`\n✓ Token works — provinces endpoint returned ${body.length} bytes.`);
