'use client';

import { useState, useEffect, useCallback } from 'react';
import { MARGIN_PASSWORD } from '@/lib/constants';

// One credential, shared by every margin-protected page on this device — there's nothing
// page-specific about "prove it's really you" the way there is about the data being protected.
const CREDENTIAL_KEY = 'marginBiometricCredentialId';
const RP_NAME = 'Naeem Autos';

function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const binary = atob(base64 + pad);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return buffer;
}

export function useMarginUnlock() {
    const [unlocked, setUnlocked] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricRegistered, setBiometricRegistered] = useState(false);
    // Shown once right after a correct password, on a device that supports biometrics but
    // hasn't registered one here yet — never offered before proving the password first, so
    // someone with brief physical access to an unlocked phone can't silently attach their own
    // Face ID/Touch ID to this gate.
    const [offerBiometricSetup, setOfferBiometricSetup] = useState(false);

    useEffect(() => {
        setBiometricRegistered(!!localStorage.getItem(CREDENTIAL_KEY));
        if (typeof window !== 'undefined' && window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(setBiometricAvailable)
                .catch(() => setBiometricAvailable(false));
        }
    }, []);

    const registerBiometric = useCallback(async () => {
        setBusy(true);
        setError(false);
        try {
            const credential = (await navigator.credentials.create({
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    rp: { name: RP_NAME },
                    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'margin-unlock', displayName: 'Margin Unlock' },
                    pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
                    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
                    timeout: 60000,
                },
            })) as PublicKeyCredential | null;
            if (!credential) throw new Error('No credential created');
            localStorage.setItem(CREDENTIAL_KEY, bufferToBase64url(credential.rawId));
            setBiometricRegistered(true);
            setOfferBiometricSetup(false);
            return true;
        } catch {
            return false;
        } finally {
            setBusy(false);
        }
    }, []);

    const verifyBiometric = useCallback(async () => {
        const storedId = localStorage.getItem(CREDENTIAL_KEY);
        if (!storedId) return false;
        setBusy(true);
        setError(false);
        try {
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    allowCredentials: [{ id: base64urlToBuffer(storedId), type: 'public-key' }],
                    userVerification: 'required',
                    timeout: 60000,
                },
            });
            if (!assertion) throw new Error('No assertion');
            setUnlocked(true);
            return true;
        } catch {
            setError(true);
            return false;
        } finally {
            setBusy(false);
        }
    }, []);

    const submitPassword = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (password === MARGIN_PASSWORD) {
            setUnlocked(true);
            setError(false);
            if (biometricAvailable && !biometricRegistered) setOfferBiometricSetup(true);
        } else {
            setError(true);
            setPassword('');
        }
    }, [password, biometricAvailable, biometricRegistered]);

    const forgetBiometric = useCallback(() => {
        localStorage.removeItem(CREDENTIAL_KEY);
        setBiometricRegistered(false);
    }, []);

    return {
        unlocked, setUnlocked, password, setPassword, error, setError, busy,
        biometricAvailable, biometricRegistered, offerBiometricSetup, setOfferBiometricSetup,
        registerBiometric, verifyBiometric, submitPassword, forgetBiometric,
    };
}
