'use client';

import { useEffect, useRef, useState } from 'react';

interface QrScannerProps {
    onScan: (text: string) => void;
    onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
    const scannerRef = useRef<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let scanner: any;

        const start = async () => {
            try {
                const { Html5QrcodeScanner } = await import('html5-qrcode');
                scanner = new Html5QrcodeScanner(
                    'qr-reader',
                    { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
                    false
                );
                scannerRef.current = scanner;
                scanner.render(
                    (decodedText: string) => {
                        scanner.clear();
                        onScan(decodedText);
                    },
                    () => { }
                );
            } catch (e) {
                setError('Camera not available. Try uploading an image instead.');
            }
        };

        start();

        return () => {
            scannerRef.current?.clear().catch(() => { });
        };
    }, [onScan]);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Scan Honda Parts QR Code</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
                </div>
                {error ? (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>{error}</div>
                ) : (
                    <div id="qr-reader" style={{ width: '100%' }} />
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                    Point camera at the QR code on the Honda parts bag
                </p>
            </div>
        </div>
    );
}
