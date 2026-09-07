// Minimal local typings for `qrcode` — @types/qrcode is not installed and we
// only use the data-URL renderer.
declare module 'qrcode' {
    interface QRCodeToDataURLOptions {
        errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
        margin?: number;
        width?: number;
        scale?: number;
        color?: { dark?: string; light?: string };
    }
    export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
    const _default: { toDataURL: typeof toDataURL };
    export default _default;
}
