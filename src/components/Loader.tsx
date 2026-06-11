'use client';

import Lottie from 'lottie-react';
import animationData from '../../public/animations/loading.json';

interface LoaderProps {
    size?: number;
    text?: string;
    fullPage?: boolean;
}

export default function Loader({ size = 180, text, fullPage = false }: LoaderProps) {
    const inner = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Lottie
                animationData={animationData}
                loop
                autoplay
                style={{ width: size, height: size }}
            />
            {text && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>{text}</p>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                {inner}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
            {inner}
        </div>
    );
}
