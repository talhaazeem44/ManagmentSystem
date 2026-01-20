'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSetup = async () => {
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/setup', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
            } else {
                setError(data.message || 'Setup failed');
            }
        } catch (err: any) {
            setError('Failed to connect to server: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-secondary-dark) 100%)',
            padding: 'var(--spacing-lg)'
        }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>🏍️</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
                        Honda DMS Setup
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Initialize your dealership management system
                    </p>
                </div>

                {!result && !error && (
                    <div>
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            background: 'var(--color-bg-elevated)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Prerequisites:
                            </h3>
                            <ol style={{ paddingLeft: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    MongoDB must be running: <code style={{ background: 'var(--color-bg)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>docker compose up -d</code>
                                </li>
                                <li>Click the button below to create the admin user</li>
                            </ol>
                        </div>

                        <button
                            onClick={handleSetup}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', fontSize: '1rem', padding: 'var(--spacing-md)' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Setting up...
                                </>
                            ) : (
                                '🚀 Initialize System'
                            )}
                        </button>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: 'var(--spacing-lg)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-error)' }}>
                            ❌ Setup Failed
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
                            {error}
                        </p>
                        <div style={{
                            padding: 'var(--spacing-md)',
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem'
                        }}>
                            <p style={{ marginBottom: 'var(--spacing-sm)' }}>To start MongoDB:</p>
                            <code>docker compose up -d</code>
                        </div>
                        <button
                            onClick={handleSetup}
                            className="btn btn-secondary"
                            style={{ marginTop: 'var(--spacing-md)' }}
                        >
                            🔄 Try Again
                        </button>
                    </div>
                )}

                {result && (
                    <div style={{
                        padding: 'var(--spacing-lg)',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-success)' }}>
                            ✅ Setup Complete!
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                            {result.message}
                        </p>

                        <div style={{
                            padding: 'var(--spacing-md)',
                            background: 'var(--color-bg-elevated)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                Login Credentials:
                            </h4>
                            <p style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                <strong>Email:</strong> {result.credentials?.email}<br />
                                <strong>Password:</strong> {result.credentials?.password}
                            </p>
                        </div>

                        <button
                            onClick={() => router.push('/login')}
                            className="btn btn-success"
                            style={{ width: '100%' }}
                        >
                            Go to Login →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
