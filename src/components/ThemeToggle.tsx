'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

export default function ThemeToggle({ style, compact, className }: { style?: React.CSSProperties; compact?: boolean; className?: string }) {
    // Starts null so the button doesn't flash the wrong icon before mounting reads the
    // actual current attribute (already set pre-hydration by the inline script in layout.tsx).
    const [theme, setTheme] = useState<Theme | null>(null);

    useEffect(() => {
        const current = document.documentElement.getAttribute('data-theme') as Theme | null;
        setTheme(current === 'dark' ? 'dark' : 'light');
    }, []);

    const toggle = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
    };

    if (!theme) return null;

    if (compact) {
        return (
            <button onClick={toggle} className={className}>
                <span style={{ fontSize: '1.1rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
        );
    }

    return (
        <button
            onClick={toggle}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                width: '100%', padding: '0.5rem', background: 'var(--color-bg-elevated)',
                color: 'var(--color-text)', border: '1px solid var(--color-border)',
                borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                ...style,
            }}
        >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
    );
}
