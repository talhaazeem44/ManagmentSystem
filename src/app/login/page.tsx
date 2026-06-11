'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await signIn('credentials', { email, password, redirect: false });
            if (result?.error) {
                setError('Invalid email or password');
            } else {
                const session = await getSession();
                const role = (session?.user as any)?.role;
                router.push(role === 'workshop' ? '/workshop' : '/dashboard');
                router.refresh();
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>

            {/* ── Left hero panel ── */}
            <div className={styles.hero}>
                {/* Background radial glow */}
                <div className={styles.heroGlow} />

                {/* Speed lines */}
                <div className={styles.lines}>
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className={styles.line} style={{ animationDelay: `${i * 0.18}s` }} />
                    ))}
                </div>

                {/* Road */}
                <div className={styles.road}>
                    <div className={styles.roadDash} />
                </div>

                {/* Brand */}
                <div className={styles.brand}>
                    <div className={styles.brandBadge}>HONDA AUTHORIZED DEALER</div>
                    <h1 className={styles.brandName}>NAEEM<br />AUTOS</h1>
                    <p className={styles.brandTag}>Dealership Management System</p>
                </div>

                {/* Big bike */}
                <div className={styles.bikeHero}>
                    <div className={styles.bikeGlow} />
                    <Image
                        src="/bike-icon.gif"
                        alt="Motorcycle"
                        width={420}
                        height={420}
                        className={styles.bikeImg}
                        unoptimized
                        priority
                    />
                </div>

                {/* Bottom stat strip */}
                <div className={styles.stats}>
                    {[
                        { label: 'BIKES SOLD', value: '1000+' },
                        { label: 'YEARS TRUSTED', value: '15+' },
                        { label: 'HAPPY CUSTOMERS', value: '500+' },
                    ].map(s => (
                        <div key={s.label} className={styles.stat}>
                            <div className={styles.statValue}>{s.value}</div>
                            <div className={styles.statLabel}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className={styles.formPanel}>
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <div className={styles.formIcon}>🏍️</div>
                        <h2 className={styles.formTitle}>Welcome Back</h2>
                        <p className={styles.formSubtitle}>Sign in to your dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div className={styles.errorMsg}>{error}</div>}

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>Email Address</label>
                            <input
                                type="email"
                                className={styles.fieldInput}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@naeem-autos.com"
                                required
                                autoFocus
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>Password</label>
                            <input
                                type="password"
                                className={styles.fieldInput}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button type="submit" className={styles.signInBtn} disabled={loading}>
                            {loading ? (
                                <><span className={styles.spinner} /> Signing in...</>
                            ) : (
                                <>Sign In →</>
                            )}
                        </button>
                    </form>

                    <p className={styles.footerText}>© 2026 Naeem Autos — Honda DMS</p>
                </div>
            </div>
        </div>
    );
}
