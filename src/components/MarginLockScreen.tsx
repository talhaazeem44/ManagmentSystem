'use client';

import { useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useMarginUnlock } from '@/hooks/useMarginUnlock';

export default function MarginLockScreen({
    title,
    subtitle,
    onUnlock,
    children,
}: {
    title: string;
    subtitle: string;
    onUnlock?: () => void;
    // Pass a function instead of plain JSX to get a `relock()` callback — e.g. for an
    // in-page "🔒 Lock" button that re-arms the gate without losing the biometric registration.
    children: React.ReactNode | ((relock: () => void) => React.ReactNode);
}) {
    const m = useMarginUnlock();
    const firedRef = useRef(false);

    useEffect(() => {
        if (m.unlocked && !firedRef.current) {
            firedRef.current = true;
            onUnlock?.();
        }
        if (!m.unlocked) firedRef.current = false;
        // onUnlock is expected to be a stable reference (e.g. a function defined once in the
        // page); re-running this on every render would re-fetch on every unrelated state change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [m.unlocked]);

    if (m.unlocked) {
        const relock = () => m.setUnlocked(false);
        return <>{typeof children === 'function' ? children(relock) : children}</>;
    }

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="card" style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h2>

                    {m.offerBiometricSetup ? (
                        <>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Set up Face ID / Touch ID on this device for faster unlocking next time?
                            </p>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ width: '100%', marginBottom: '0.6rem' }}
                                disabled={m.busy}
                                onClick={m.registerBiometric}
                            >
                                {m.busy ? 'Setting up...' : '🫆 Set Up Face ID / Touch ID'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                onClick={() => m.setOfferBiometricSetup(false)}
                            >
                                Not now
                            </button>
                        </>
                    ) : (
                        <>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                {subtitle}
                            </p>

                            {m.biometricAvailable && m.biometricRegistered && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{ width: '100%', marginBottom: '1rem' }}
                                        disabled={m.busy}
                                        onClick={m.verifyBiometric}
                                    >
                                        {m.busy ? 'Checking...' : '🫆 Unlock with Face ID / Touch ID'}
                                    </button>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>or use your password</div>
                                </>
                            )}

                            <form onSubmit={m.submitPassword}>
                                <input type="password" className="input" placeholder="Password" value={m.password}
                                    onChange={e => { m.setPassword(e.target.value); m.setError(false); }}
                                    style={{ marginBottom: '0.75rem', borderColor: m.error ? '#ef4444' : undefined, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em' }}
                                    autoFocus={!(m.biometricAvailable && m.biometricRegistered)} />
                                {m.error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Wrong password</p>}
                                <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>Unlock</button>
                            </form>

                            {m.biometricRegistered && (
                                <button
                                    type="button"
                                    onClick={m.forgetBiometric}
                                    style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Forget Face ID / Touch ID on this device
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
