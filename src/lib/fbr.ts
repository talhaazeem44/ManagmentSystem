/**
 * FBR Digital Invoicing (DI) client — PRAL gateway.
 *
 * Docs: "Technical Documentation for DI API" (v1.12), download1.fbr.gov.pk
 * Token: 5-year Bearer token issued from IRIS (iris.fbr.gov.pk) →
 *        Registration → "Digital Invoicing" → Sandbox/Production token.
 *
 * Mode is driven by FBR_MODE: 'sandbox' (default) or 'production'.
 * Nothing here throws on FBR-side rejection — callers get a structured result
 * so an invalid invoice can be stored, shown and retried.
 */

const GW = 'https://gw.fbr.gov.pk';

export type FbrMode = 'sandbox' | 'production';

export function fbrMode(): FbrMode {
    return process.env.FBR_MODE === 'production' ? 'production' : 'sandbox';
}

function token(): string {
    const t = fbrMode() === 'production'
        ? process.env.FBR_PROD_TOKEN
        : process.env.FBR_SANDBOX_TOKEN;
    if (!t) throw new Error(`FBR token missing: set ${fbrMode() === 'production' ? 'FBR_PROD_TOKEN' : 'FBR_SANDBOX_TOKEN'} in .env`);
    return t;
}

const suffix = () => (fbrMode() === 'production' ? '' : '_sb');

export const FBR_URLS = {
    post: () => `${GW}/di_data/v1/di/postinvoicedata${suffix()}`,
    validate: () => `${GW}/di_data/v1/di/validateinvoicedata${suffix()}`,
    // Reference data (public-ish, still needs the bearer token)
    provinces: `${GW}/pdi/v1/provinces`,
    docTypeCode: `${GW}/pdi/v1/doctypecode`,
    itemDescCode: `${GW}/pdi/v1/itemdesccode`,
    sroItemCode: `${GW}/pdi/v1/sroitemcode`,
    transTypeCode: `${GW}/pdi/v1/transtypecode`,
    uom: `${GW}/pdi/v1/uom`,
    sroSchedule: `${GW}/pdi/v2/SroSchedule`,
    saleTypeToRate: `${GW}/pdi/v2/SaleTypeToRate`,
    hsUom: `${GW}/pdi/v2/HS_UOM`,
    statl: `${GW}/dist/v1/statl`,
    regType: `${GW}/dist/v1/Get_Reg_Type`,
};

// ── Payload types (field names must match FBR spec exactly) ──────────────────

export interface FbrInvoiceItem {
    hsCode: string;
    productDescription: string;
    rate: string;                 // e.g. "18%"
    uoM: string;                  // e.g. "Numbers, pieces, units"
    quantity: number;
    totalValues: number;          // value incl. sales tax
    valueSalesExcludingST: number;
    fixedNotifiedValueOrRetailPrice: number;
    salesTaxApplicable: number;
    salesTaxWithheldAtSource: number;
    extraTax?: string | number;
    furtherTax?: number;
    sroScheduleNo?: string;
    fedPayable?: number;
    discount?: number;
    saleType: string;             // e.g. "Goods at standard rate (default)"
    sroItemSerialNo?: string;
}

export interface FbrInvoicePayload {
    invoiceType: string;          // "Sale Invoice" | "Debit Note"
    invoiceDate: string;          // YYYY-MM-DD
    sellerNTNCNIC: string;
    sellerBusinessName: string;
    sellerProvince: string;
    sellerAddress: string;
    buyerNTNCNIC: string;
    buyerBusinessName: string;
    buyerProvince: string;
    buyerAddress: string;
    buyerRegistrationType: 'Registered' | 'Unregistered';
    invoiceRefNo: string;         // required only for Debit Note
    scenarioId?: string;          // sandbox only
    items: FbrInvoiceItem[];
}

export interface FbrValidationResponse {
    statusCode?: string;
    status?: string;              // "Valid" | "Invalid"
    error?: string;
    errorCode?: string;
    invoiceStatuses?: Array<{
        itemSNo?: string;
        statusCode?: string;
        status?: string;
        invoiceNo?: string;
        errorCode?: string;
        error?: string;
    }>;
}

export interface FbrPostResponse {
    invoiceNumber?: string;       // the IRN, on success
    dated?: string;
    validationResponse?: FbrValidationResponse;
}

// ── Seller config ────────────────────────────────────────────────────────────

export function seller() {
    const s = {
        ntncnic: process.env.FBR_SELLER_NTNCNIC || '',
        businessName: process.env.FBR_SELLER_BUSINESS_NAME || '',
        province: process.env.FBR_SELLER_PROVINCE || 'Punjab',
        address: process.env.FBR_SELLER_ADDRESS || '',
    };
    if (!s.ntncnic || !s.businessName || !s.address) {
        throw new Error('FBR seller details missing: set FBR_SELLER_NTNCNIC, FBR_SELLER_BUSINESS_NAME, FBR_SELLER_ADDRESS in .env');
    }
    return s;
}

/** Defaults for a motorcycle sale line; override per item where needed. */
export const FBR_DEFAULTS = {
    bikeHsCode: process.env.FBR_BIKE_HS_CODE || '8711.2090',
    partsHsCode: process.env.FBR_PARTS_HS_CODE || '8714.1090',
    serviceHsCode: process.env.FBR_SERVICE_HS_CODE || '9821.4000',
    uom: process.env.FBR_UOM || 'Numbers, pieces, units',
    rate: process.env.FBR_SALES_TAX_RATE || '18%',
    saleType: process.env.FBR_SALE_TYPE || 'Goods at standard rate (default)',
    // Sandbox scenarios, chosen by buyer registration type. A CNIC-based seller
    // is an "unregistered user" to FBR and only SN002 is accepted for it.
    scenarioRegistered: process.env.FBR_SCENARIO_REGISTERED || 'SN002',
    scenarioUnregistered: process.env.FBR_SCENARIO_UNREGISTERED || 'SN002',
    includeServiceCharges: process.env.FBR_INCLUDE_SERVICE_CHARGES === 'true',
};

/** Sales tax rate as a fraction, parsed from FBR_DEFAULTS.rate ("18%" → 0.18). */
export function taxFraction(rate: string = FBR_DEFAULTS.rate): number {
    const n = parseFloat(String(rate).replace('%', ''));
    return Number.isFinite(n) ? n / 100 : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build one item line from a gross (tax-inclusive) amount — the way prices are
 * recorded in this system. Splits it back into net value + sales tax.
 */
export function itemFromGross(opts: {
    hsCode: string;
    description: string;
    quantity: number;
    grossTotal: number;
    rate?: string;
    uoM?: string;
    saleType?: string;
}): FbrInvoiceItem {
    const rate = opts.rate || FBR_DEFAULTS.rate;
    const f = taxFraction(rate);
    const net = round2(opts.grossTotal / (1 + f));
    const tax = round2(opts.grossTotal - net);
    return {
        hsCode: opts.hsCode,
        productDescription: opts.description,
        rate,
        uoM: opts.uoM || FBR_DEFAULTS.uom,
        quantity: opts.quantity,
        totalValues: round2(opts.grossTotal),
        valueSalesExcludingST: net,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable: tax,
        salesTaxWithheldAtSource: 0,
        extraTax: '',
        furtherTax: 0,
        sroScheduleNo: '',
        fedPayable: 0,
        discount: 0,
        saleType: opts.saleType || FBR_DEFAULTS.saleType,
        sroItemSerialNo: '',
    };
}

// ── Transport ────────────────────────────────────────────────────────────────

async function call<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), init.timeoutMs ?? 30_000);
    try {
        const res = await fetch(url, {
            ...init,
            signal: ctl.signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token()}`,
                ...(init.headers || {}),
            },
        });
        const text = await res.text();
        let body: unknown;
        try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
        if (!res.ok) {
            const b = (body ?? {}) as { message?: string; error?: string; raw?: string };
            const msg = b.message || b.error || b.raw || res.statusText;
            throw new Error(`FBR ${res.status}: ${typeof msg === 'string' ? msg.slice(0, 500) : JSON.stringify(msg).slice(0, 500)}`);
        }
        return body as T;
    } finally {
        clearTimeout(timer);
    }
}

/** Dry-run against FBR's validator. Does not create an IRN. */
export async function validateInvoice(payload: FbrInvoicePayload): Promise<FbrPostResponse> {
    return call<FbrPostResponse>(FBR_URLS.validate(), { method: 'POST', body: JSON.stringify(payload) });
}

/** Submit for real. On success the response carries the FBR invoice number (IRN). */
export async function postInvoice(payload: FbrInvoicePayload): Promise<FbrPostResponse> {
    return call<FbrPostResponse>(FBR_URLS.post(), { method: 'POST', body: JSON.stringify(payload) });
}

export async function reference(key: keyof typeof FBR_URLS): Promise<unknown> {
    const url = FBR_URLS[key];
    if (typeof url !== 'string') throw new Error(`"${key}" is not a reference endpoint`);
    return call<unknown>(url, { method: 'GET' });
}

/** Flatten an FBR response into a storable status. */
export function readResponse(res: FbrPostResponse): {
    status: 'VALID' | 'INVALID';
    invoiceNumber?: string;
    error?: string;
} {
    const v = res?.validationResponse;
    const ok = v?.status === 'Valid' || v?.statusCode === '00';
    if (ok && res.invoiceNumber) {
        return { status: 'VALID', invoiceNumber: res.invoiceNumber };
    }
    const itemErr = v?.invoiceStatuses?.find(i => i.error)?.error;
    return {
        status: 'INVALID',
        invoiceNumber: res.invoiceNumber,
        error: v?.error || itemErr || 'FBR rejected the invoice (no reason returned)',
    };
}
