/**
 * Turns this system's own documents (bike Sale, workshop ServiceSale) into the
 * JSON shape FBR's Digital Invoicing API expects.
 */
import { Sale, ServiceSale, Bike, Customer } from '@/models';
import {
    FBR_DEFAULTS,
    fbrMode,
    itemFromGross,
    seller,
    type FbrInvoicePayload,
    type FbrInvoiceItem,
} from '@/lib/fbr';

const ymd = (d: Date | string | undefined) =>
    new Date(d || Date.now()).toISOString().slice(0, 10);

/** FBR wants CNICs as 13 digits and NTNs as 7/9 — strip separators. */
const cleanId = (v?: string) => (v || '').replace(/\D/g, '');

/**
 * Buyer registration type. A 13-digit CNIC is an unregistered walk-in buyer;
 * a 7 or 9 digit NTN means the buyer is sales-tax registered.
 */
function buyerType(id: string): 'Registered' | 'Unregistered' {
    return id.length === 7 || id.length === 9 ? 'Registered' : 'Unregistered';
}

/**
 * FBR accepts only a 13-digit CNIC or a 7/9-digit NTN (error 0002 otherwise).
 * Catching it here keeps a half-typed CNIC from costing a round trip and gives
 * the shopkeeper a message that says which record to fix.
 */
function assertBuyerId(id: string, who: string): void {
    if (id.length !== 13 && id.length !== 7 && id.length !== 9) {
        throw new Error(
            `${who} ka CNIC/NTN galat hai (${id.length} digits: "${id}"). ` +
            'FBR sirf 13-digit CNIC ya 7/9-digit NTN leta hai — customer record theek karke dobara submit karein.'
        );
    }
}

function base(invoiceDate: string, buyerRegistrationType: 'Registered' | 'Unregistered') {
    const s = seller();
    const payload: Partial<FbrInvoicePayload> = {
        invoiceType: 'Sale Invoice',
        invoiceDate,
        sellerNTNCNIC: cleanId(s.ntncnic),
        sellerBusinessName: s.businessName,
        sellerProvince: s.province,
        sellerAddress: s.address,
        invoiceRefNo: '',
    };
    // FBR rejects a registered-buyer scenario on an unregistered-buyer invoice
    // (error 0205), so the scenario has to track the buyer type.
    if (fbrMode() === 'sandbox') {
        payload.scenarioId = buyerRegistrationType === 'Registered'
            ? FBR_DEFAULTS.scenarioRegistered
            : FBR_DEFAULTS.scenarioUnregistered;
    }
    return payload;
}

/** Bike sale → single-line invoice for the motorcycle. */
export async function buildSalePayload(saleId: string): Promise<{
    payload: FbrInvoicePayload;
    localInvoiceNumber: string;
}> {
    const sale = await Sale.findById(saleId).lean();
    if (!sale) throw new Error('Sale not found');

    const [bike, customer] = await Promise.all([
        Bike.findById(sale.bikeId).lean(),
        Customer.findById(sale.customerId).lean(),
    ]);
    if (!bike) throw new Error('Bike not found for this sale');
    if (!customer) throw new Error('Customer not found for this sale');

    const buyerId = cleanId(customer.cnic);
    if (!buyerId) throw new Error('Customer CNIC is missing — FBR requires buyer NTN/CNIC');
    assertBuyerId(buyerId, `Customer "${customer.name}"`);

    // The recorded price is what the customer pays, i.e. tax-inclusive.
    const item = itemFromGross({
        hsCode: FBR_DEFAULTS.bikeHsCode,
        description: `Honda ${bike.model} ${bike.color} — Engine ${bike.engineNumber}, Chassis ${bike.chassisNumber}`,
        quantity: 1,
        grossTotal: sale.price,
    });

    const registrationType = buyerType(buyerId);

    return {
        localInvoiceNumber: sale.receiptNumber || String(sale._id),
        payload: {
            ...(base(ymd(sale.saleDate), registrationType) as FbrInvoicePayload),
            buyerNTNCNIC: buyerId,
            buyerBusinessName: customer.name,
            buyerProvince: seller().province,
            buyerAddress: customer.address || 'N/A',
            buyerRegistrationType: registrationType,
            items: [item],
        },
    };
}

/** Workshop service sale → one line per part plus one line for labour. */
export async function buildServiceSalePayload(serviceSaleId: string): Promise<{
    payload: FbrInvoicePayload;
    localInvoiceNumber: string;
}> {
    const ss = await ServiceSale.findById(serviceSaleId).lean();
    if (!ss) throw new Error('Service sale not found');

    const items: FbrInvoiceItem[] = ss.items.map(it =>
        itemFromGross({
            hsCode: FBR_DEFAULTS.partsHsCode,
            description: it.name,
            quantity: it.quantity,
            grossTotal: it.customerPrice * it.quantity,
        })
    );

    // Labour is reported only when explicitly enabled — see FBR_INCLUDE_SERVICE_CHARGES.
    if (FBR_DEFAULTS.includeServiceCharges && ss.serviceCharges > 0) {
        items.push(itemFromGross({
            hsCode: FBR_DEFAULTS.serviceHsCode,
            description: `${ss.serviceType} — labour/service charges`,
            quantity: 1,
            grossTotal: ss.serviceCharges,
        }));
    }

    if (items.length === 0) {
        throw new Error(
            'Service sale has no reportable goods lines' +
            (ss.serviceCharges > 0 ? ' (labour-only sale; FBR_INCLUDE_SERVICE_CHARGES is off)' : '')
        );
    }

    // Workshop walk-ins are unregistered and carry no CNIC on the service sale,
    // so they bill against the reserved unregistered-buyer id.
    const buyerId = cleanId(process.env.FBR_UNREGISTERED_BUYER_ID) || '1000000000000';
    assertBuyerId(buyerId, 'FBR_UNREGISTERED_BUYER_ID');

    return {
        localInvoiceNumber: String(ss._id),
        payload: {
            ...(base(ymd(ss.date), 'Unregistered') as FbrInvoicePayload),
            buyerNTNCNIC: buyerId,
            buyerBusinessName: ss.customerName,
            buyerProvince: seller().province,
            buyerAddress: ss.bikeNumber ? `Bike ${ss.bikeNumber}` : 'N/A',
            buyerRegistrationType: 'Unregistered',
            items,
        },
    };
}

export async function buildPayload(sourceType: 'SALE' | 'SERVICE_SALE', sourceId: string) {
    return sourceType === 'SALE'
        ? buildSalePayload(sourceId)
        : buildServiceSalePayload(sourceId);
}
