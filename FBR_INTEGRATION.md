# FBR Digital Invoicing (DI) Integration

Built in response to the Pre-Suspension Notice (C.No.E-95/ST/3460108122414, dated
28-08-2026) requiring M/s NAEEM AUTOS (STRN 3277876291446) to integrate with
FBR's Digital Invoicing system and issue digital invoices.

## What was added

| File | Purpose |
|---|---|
| `src/lib/fbr.ts` | FBR/PRAL gateway client — endpoints, auth, payload types, tax split |
| `src/lib/fbrBuild.ts` | Turns a bike `Sale` or workshop `ServiceSale` into an FBR payload |
| `src/lib/fbrSubmit.ts` | Submit + record, with a non-blocking background variant |
| `src/models/index.ts` | `FbrInvoice` model — one record per invoice sent to FBR |
| `src/app/api/fbr/submit` | `POST` — submit or `validateOnly` dry-run |
| `src/app/api/fbr/invoices` | `GET` — list reported invoices |
| `src/app/api/fbr/status` | `GET` — config check + how much is unreported |
| `src/app/api/fbr/reference` | `GET ?key=provinces\|uom\|itemDescCode\|…` — FBR lookup lists |
| `src/app/fbr/page.tsx` | Dashboard page: counts, rejected invoices, retry |
| `scripts/fbr-check.mjs` | `node scripts/fbr-check.mjs` — verify token and seller config |

Every new bike sale (`POST /api/sales`) and workshop service sale
(`POST /api/workshop`) is reported to FBR automatically. Submission is
deliberately **not awaited** — an FBR outage never blocks recording a sale.
Failures are stored and retryable from the **FBR Invoicing** page.

## Setup steps

1. **Register for DI in IRIS** — log in at https://iris.fbr.gov.pk →
   Registration → Digital Invoicing. This flips your "DI Registration Status"
   from NO to YES, which is what the notice is about.
2. **Generate tokens** — the same screen issues a 5-year sandbox token and,
   after scenario approval, a production token.
3. **Fill `.env`** — `FBR_SANDBOX_TOKEN`, then later `FBR_PROD_TOKEN`.
   Seller details are pre-filled from the notice; verify them against your
   registration certificate.
4. **Verify connectivity** — `node scripts/fbr-check.mjs`
5. **Test in sandbox** — keep `FBR_MODE=sandbox`, record a test sale, and check
   the FBR Invoicing page. Use `validateOnly: true` on `/api/fbr/submit` for a
   dry run that creates no IRN.
6. **Complete FBR's scenarios** — FBR assigns scenario IDs (SN001, SN002, …) per
   business activity; set `FBR_SCENARIO_ID` accordingly. Passing them unlocks the
   production token.
7. **Go live** — set `FBR_MODE=production` and fill `FBR_PROD_TOKEN`.

## Sandbox verification (2026-09-07)

Validated live against `validateinvoicedata_sb` with the sandbox token:

| Payload | Result |
|---|---|
| Bike sale, unregistered buyer, SN002 | **Valid** |
| Workshop parts (2 lines), SN002 | **Valid** |
| Workshop labour line, HS 9821.4000 | Invalid — no valid UoM for this registration |

Findings baked into `.env`:

- **Seller is `3460108122414`** (the CNIC in the notice's C.No), *not* the STRN
  `3277876291446`. The STRN is rejected with error 0401.
- **Only scenario SN002 works.** FBR treats this CNIC-based seller as an
  "unregistered user": SN001 and SN003–SN008 were all rejected. Both buyer types
  therefore use SN002. Scenario IDs are sandbox-only and ignored in production.
- **Workshop labour is excluded by default** (`FBR_INCLUDE_SERVICE_CHARGES=false`).
  HS 9821.4000 returns no allowed UoM against this registration, and the
  "Services" sale type has no matching scenario — consistent with services in
  Punjab being PRA's remit rather than FBR's. Parts are still reported normally.
  A labour-only service sale will raise "no reportable goods lines" and appear as
  a failure on `/fbr`.

## Needs your tax consultant's confirmation

These are defaults in `.env`, not verified against your registration:

- `FBR_BIKE_HS_CODE=8711.2090` (motorcycles), `FBR_PARTS_HS_CODE=8714.1090`
  (parts), `FBR_SERVICE_HS_CODE=9821.4000` (workshop labour)
- `FBR_SALES_TAX_RATE=18%` and `FBR_SALE_TYPE=Goods at standard rate (default)`
- **Prices are treated as tax-inclusive.** `itemFromGross()` splits the recorded
  price back into net value + sales tax. If your recorded prices are actually
  tax-exclusive, this must change.
- Whether a Honda dealer's bike sales fall under a special/fixed regime rather
  than the standard rate.
- Whether workshop labour must be invoiced to PRA separately, and whether it
  should appear on the FBR invoice at all (see `FBR_INCLUDE_SERVICE_CHARGES`).

## Not yet done

- Printing the FBR IRN + QR code on the customer receipt (FBR requires the IRN
  and a QR code on the issued invoice). The IRN is stored on `FbrInvoice`; the
  receipt templates in `src/app/sales/[id]/` still need it added.
- Backfilling historical sales — the API accepts one document at a time via
  `/api/fbr/submit`; FBR's rules on backdated invoices should be checked first.
- Credit notes / cancellations (`invoiceType: "Debit Note"` with `invoiceRefNo`).
