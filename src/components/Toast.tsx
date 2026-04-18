'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toasts: ToastMessage[];
    removeToast: (id: number) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
    return (
        <div style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
            maxWidth: '360px', width: '100%'
        }}>
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, []);

    const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
        success: { bg: '#052e16', border: '#16a34a', icon: '✓' },
        error:   { bg: '#450a0a', border: '#dc2626', icon: '✕' },
        info:    { bg: '#0c1a2e', border: '#3b82f6', icon: 'ℹ' },
    };
    const c = colors[toast.type];

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            padding: '0.875rem 1rem', borderRadius: '8px',
            background: c.bg, border: `1px solid ${c.border}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            animation: 'slideIn 0.2s ease',
        }}>
            <span style={{ fontSize: '1rem', color: c.border, fontWeight: 700, flexShrink: 0 }}>{c.icon}</span>
            <span style={{ fontSize: '0.875rem', color: '#f1f5f9', flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1rem', flexShrink: 0, padding: 0 }}>×</button>
        </div>
    );
}
