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

            {/* Noise texture overlay */}
            <div className={styles.noise} />

            {/* Big watermark text */}
            <div className={styles.watermark}>NAEEM AUTOS</div>

            {/* Spotlight behind bike */}
            <div className={styles.spotlight} />
            <div className={styles.spotlight2} />

            {/* Bike image — right side hero */}
            <div className={styles.bikeWrap}>
                <Image
                    src="/honda-bike.png"
                    alt="Honda CG150"
                    width={820}
                    height={500}
                    className={styles.bikeImg}
                    priority
                    unoptimized
                />
                {/* Ground shadow */}
                <div className={styles.groundShadow} />
            </div>

            {/* Left: brand + form */}
            <div className={styles.leftPanel}>

                {/* Honda badge */}
                <div className={styles.badge}>
                    <span className={styles.badgeDot} />
                    HONDA AUTHORIZED DEALER
                </div>

                <h1 className={styles.brand}>NAEEM<br /><span className={styles.brandAccent}>AUTOS</span></h1>
                <p className={styles.tagline}>Dealership Management System</p>

                {/* Divider */}
                <div className={styles.divider} />

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorMsg}>{error}</div>}

                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Email</label>
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
                        {loading ? <><span className={styles.spinner} /> Signing in...</> : 'SIGN IN →'}
                    </button>
                </form>

                <p className={styles.footer}>© 2026 Naeem Autos</p>
            </div>

        </div>
    );
}
