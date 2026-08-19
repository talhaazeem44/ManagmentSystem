// Direct-to-printer support for generic ESC/POS 80mm thermal receipt printers (e.g. the
// "BlackCopper"/POS80 printer used in Workshop) via the browser's WebUSB API.
//
// Why this exists: these printers only understand raw ESC/POS command bytes. macOS has no
// bundled driver for them, and the built-in "Generic" driver families (PostScript, PCL, dot
// matrix, label) all send data the printer can't interpret — it just dumps that data back out
// as garbage text non-stop. WebUSB bypasses the OS print system (driver, CUPS, print dialog)
// entirely: the page talks straight to the USB device and sends bytes the printer actually
// understands.
//
// Caveats:
// - Chrome/Edge only — Safari and Firefox don't implement WebUSB.
// - If the printer is also registered as a CUPS printer in System Settings, macOS's built-in
//   USB printer class driver may hold an exclusive claim on the interface, which makes
//   claimInterface() fail. Removing that CUPS printer entry frees it up for WebUSB.

const ESC = 0x1b;
const GS = 0x1d;

class EscPosBuilder {
    private parts: Uint8Array[] = [];
    private encoder = new TextEncoder();

    text(s: string) {
        this.parts.push(this.encoder.encode(s));
        return this;
    }

    raw(...bytes: number[]) {
        this.parts.push(new Uint8Array(bytes));
        return this;
    }

    init() { return this.raw(ESC, 0x40); }
    align(pos: 'left' | 'center' | 'right') {
        return this.raw(ESC, 0x61, pos === 'center' ? 1 : pos === 'right' ? 2 : 0);
    }
    bold(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
    doubleSize(on: boolean) { return this.raw(GS, 0x21, on ? 0x11 : 0x00); }
    // Line spacing in dots (ESC 3 n) — thermal printers don't have CSS point sizes, so this is
    // what actually makes the receipt "taller"/more spaced out. Default is usually ~30 dots.
    lineSpacing(dots: number) { return this.raw(ESC, 0x33, dots); }
    feed(lines = 1) { return this.text('\n'.repeat(lines)); }
    cutPartial() { return this.raw(GS, 0x56, 0x01); }

    build(): Uint8Array {
        const total = this.parts.reduce((s, p) => s + p.length, 0);
        const out = new Uint8Array(total);
        let offset = 0;
        for (const p of this.parts) { out.set(p, offset); offset += p.length; }
        return out;
    }
}

const LINE_WIDTH = 42; // typical characters-per-line for an 80mm thermal printer, Font A

function twoCol(left: string, right: string, width = LINE_WIDTH): string {
    const gap = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(gap) + right + '\n';
}

function centerLine(text: string, width = LINE_WIDTH): string {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text + '\n';
}

function divider(ch = '-', width = LINE_WIDTH): string {
    return ch.repeat(width) + '\n';
}

export interface ThermalBillItem {
    name: string;
    productCode?: string;
    quantity: number;
    customerPrice: number;
}

export interface ThermalReceiptData {
    customerName: string;
    customerMobile?: string;
    bikeNumber?: string;
    serviceType: string;
    date: string | Date;
    description?: string;
    serviceCharges?: number;
    items?: ThermalBillItem[];
    totalAmount?: number;
    amount?: number;
}

export function buildServiceReceiptBytes(service: ThermalReceiptData): Uint8Array {
    const total = service.totalAmount ?? service.amount ?? 0;
    const labour = service.serviceCharges ?? service.amount ?? 0;
    const items = service.items ?? [];
    const partsTotal = items.reduce((s, i) => s + i.customerPrice * i.quantity, 0);
    const dateStr = new Date(service.date).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const b = new EscPosBuilder();
    b.init();
    b.lineSpacing(42); // a bit taller than the printer's default (~30 dots)

    b.align('center');
    b.doubleSize(true).bold(true);
    b.text('NAEEM AUTOS\n');
    b.doubleSize(false).bold(false);
    b.text('Honda Authorized Dealer\n');
    b.text('Contact: 0331-8800216\n');
    b.text('JOB CARD\n');
    b.text(dateStr + '\n');

    b.align('left');
    b.text(divider());
    b.bold(true); b.text(twoCol('Customer:', service.customerName)); b.bold(false);
    if (service.customerMobile) b.text(twoCol('Mobile:', service.customerMobile));
    if (service.bikeNumber) { b.bold(true); b.text(twoCol('Bike No:', service.bikeNumber)); b.bold(false); }

    b.text(divider());
    b.bold(true);
    b.text(twoCol(service.serviceType, `Rs.${labour.toLocaleString()}`));
    b.bold(false);
    if (service.description) b.text(`Note: ${service.description}\n`);

    if (items.length > 0) {
        b.text(divider());
        b.bold(true).text('PARTS & ITEMS\n').bold(false);
        for (const it of items) {
            const amt = `Rs.${(it.customerPrice * it.quantity).toLocaleString()}`;
            b.text(twoCol(`${it.name} x${it.quantity}`.slice(0, LINE_WIDTH - amt.length - 1), amt));
            if (it.productCode) b.text(`  ${it.productCode}\n`);
        }
        b.text(divider('.'));
        b.text(twoCol('Labour', `Rs.${labour.toLocaleString()}`));
        b.text(twoCol('Parts', `Rs.${partsTotal.toLocaleString()}`));
    }

    b.text(divider());
    b.doubleSize(true).bold(true);
    b.text(twoCol('TOTAL:', `Rs.${total.toLocaleString()}`, 21)); // half width at double size
    b.doubleSize(false).bold(false);
    b.text(divider());

    b.align('center');
    b.text('Thank you for visiting Naeem Autos!\n');
    b.text('Honda Authorized Dealer\n');

    b.feed(4);
    b.cutPartial();

    return b.build();
}

export function isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
}

async function findPrintableInterface(device: USBDevice): Promise<{ interfaceNumber: number; endpointNumber: number }> {
    if (!device.configuration) {
        await device.selectConfiguration(1);
    }
    for (const iface of device.configuration!.interfaces) {
        for (const alt of iface.alternates) {
            const outEp = alt.endpoints.find(e => e.direction === 'out');
            if (outEp) {
                return { interfaceNumber: iface.interfaceNumber, endpointNumber: outEp.endpointNumber };
            }
        }
    }
    throw new Error('No USB OUT endpoint found on this device — it may not be a printer.');
}

// Reconnects to a previously-approved printer without prompting, if one exists.
export async function getRememberedPrinter(): Promise<USBDevice | null> {
    if (!isWebUsbSupported()) return null;
    const devices = await navigator.usb.getDevices();
    return devices[0] ?? null;
}

// Prompts the user to pick the USB printer (one-time — the browser remembers the grant).
export async function pickPrinter(): Promise<USBDevice> {
    if (!isWebUsbSupported()) {
        throw new Error('Direct USB printing needs Chrome or Edge — this browser doesn\'t support it.');
    }
    return navigator.usb.requestDevice({ filters: [] });
}

export async function sendToThermalPrinter(device: USBDevice, data: Uint8Array): Promise<void> {
    await device.open();
    try {
        const { interfaceNumber, endpointNumber } = await findPrintableInterface(device);
        try {
            await device.claimInterface(interfaceNumber);
        } catch (e) {
            throw new Error(
                'Could not get exclusive access to the printer. If it\'s also set up as a printer in ' +
                'System Settings → Printers & Scanners, remove it from there — macOS holds the USB ' +
                'connection open for it, which blocks direct printing.'
            );
        }
        const payload = new ArrayBuffer(data.byteLength);
        new Uint8Array(payload).set(data);
        await device.transferOut(endpointNumber, payload);
        await device.releaseInterface(interfaceNumber);
    } finally {
        await device.close();
    }
}
