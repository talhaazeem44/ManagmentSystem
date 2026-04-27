'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

const BikeSVG = ({ color = '#dc2626' }: { color?: string }) => (
    <svg width="200" height="90" viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Rear wheel */}
        <circle cx="38" cy="68" r="20" stroke={color} strokeWidth="4.5" />
        <circle cx="38" cy="68" r="7"  fill={color} />
        <line x1="38" y1="48" x2="38" y2="88" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <line x1="18" y1="68" x2="58" y2="68" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <line x1="24" y1="54" x2="52" y2="82" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <line x1="52" y1="54" x2="24" y2="82" stroke={color} strokeWidth="1.5" opacity="0.35" />

        {/* Front wheel */}
        <circle cx="162" cy="68" r="20" stroke={color} strokeWidth="4.5" />
        <circle cx="162" cy="68" r="7"  fill={color} />
        <line x1="162" y1="48" x2="162" y2="88" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <line x1="142" y1="68" x2="182" y2="68" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <line x1="148" y1="54" x2="176" y2="82" stroke={color} strokeWidth="1.5" opacity="0.35" />
        <line x1="176" y1="54" x2="148" y2="82" stroke={color} strokeWidth="1.5" opacity="0.35" />

        {/* Main frame backbone */}
        <path d="M38 48 L65 16 L118 14 L142 48" stroke={color} strokeWidth="4.5" strokeLinejoin="round" fill="none" />

        {/* Seat */}
        <path d="M68 14 Q93 7 122 12" stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" />

        {/* Fuel tank */}
        <path d="M68 14 L74 35 L112 35 L118 14 Z" fill={color} opacity="0.75" />

        {/* Engine block */}
        <rect x="66" y="35" width="48" height="24" rx="4" fill={color} opacity="0.55" />

        {/* Rear stay (swing arm) */}
        <line x1="66" y1="52" x2="38" y2="68" stroke={color} strokeWidth="3.5" />

        {/* Front fork */}
        <line x1="148" y1="46" x2="162" y2="68" stroke={color} strokeWidth="4.5" />
        <line x1="144" y1="46" x2="156" y2="68" stroke={color} strokeWidth="3" opacity="0.5" />

        {/* Handlebar stem */}
        <line x1="136" y1="20" x2="142" y2="46" stroke={color} strokeWidth="4" />

        {/* Handlebar */}
        <path d="M124 16 Q136 12 148 20" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Headlight */}
        <circle cx="170" cy="52" r="8"  fill={color} opacity="0.9" />
        <circle cx="170" cy="52" r="4"  fill="#fff"  opacity="0.6" />

        {/* Exhaust pipe */}
        <path d="M68 54 Q50 62 14 58" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M14 58 Q8 57 6 60" stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.5" />

        {/* Footpeg */}
        <line x1="82"  y1="57" x2="82"  y2="66" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="110" y1="57" x2="110" y2="66" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
);

const PARTICLES = [
    { left: '8%',  bottom: '12%', size: 3, duration: '5s',  delay: '0s'    },
    { left: '15%', bottom: '8%',  size: 2, duration: '4s',  delay: '0.8s'  },
    { left: '22%', bottom: '15%', size: 4, duration: '6s',  delay: '1.5s'  },
    { left: '30%', bottom: '10%', size: 2, duration: '3.5s',delay: '0.3s'  },
    { left: '38%', bottom: '8%',  size: 3, duration: '5.5s',delay: '2s'    },
    { left: '45%', bottom: '12%', size: 2, duration: '4s',  delay: '1s'    },
    { left: '52%', bottom: '9%',  size: 4, duration: '6.5s',delay: '0.5s'  },
    { left: '60%', bottom: '14%', size: 2, duration: '4.5s',delay: '1.8s'  },
    { left: '67%', bottom: '8%',  size: 3, duration: '5s',  delay: '0.2s'  },
    { left: '74%', bottom: '11%', size: 2, duration: '3.8s',delay: '2.5s'  },
    { left: '81%', bottom: '13%', size: 3, duration: '5.2s',delay: '1.2s'  },
    { left: '88%', bottom: '9%',  size: 2, duration: '4.2s',delay: '0.7s'  },
    { left: '93%', bottom: '12%', size: 4, duration: '6s',  delay: '3s'    },
    { left: '5%',  bottom: '18%', size: 2, duration: '7s',  delay: '1.5s'  },
    { left: '50%', bottom: '18%', size: 2, duration: '6.5s',delay: '0.9s'  },
];

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

            {/* Glow orbs */}
            <div className={`${styles.glow} ${styles.glowTopLeft}`} />
            <div className={`${styles.glow} ${styles.glowBottomRight}`} />

            {/* Floating particles */}
            {PARTICLES.map((p, i) => (
                <div key={i} className={styles.particle} style={{
                    left: p.left, bottom: p.bottom,
                    width: p.size, height: p.size,
                    background: i % 3 === 0 ? 'rgba(220,38,38,0.7)' : i % 3 === 1 ? 'rgba(255,100,100,0.5)' : 'rgba(255,160,80,0.5)',
                    animationDuration: p.duration,
                    animationDelay: p.delay,
                }} />
            ))}

            {/* Bike 1 — large, main */}
            <div className={`${styles.bikeWrap} ${styles.bike1}`}>
                <div className={styles.speedLines}>
                    <div className={styles.speedLine} />
                    <div className={styles.speedLine} />
                    <div className={styles.speedLine} />
                </div>
                <BikeSVG color="#dc2626" />
            </div>

            {/* Bike 2 — small, fast */}
            <div className={`${styles.bikeWrap} ${styles.bike2}`}>
                <div className={styles.speedLines}>
                    <div className={styles.speedLine} />
                    <div className={styles.speedLine} />
                    <div className={styles.speedLine} />
                </div>
                <BikeSVG color="#ef4444" />
            </div>

            {/* Bike 3 — medium, slow (background) */}
            <div className={`${styles.bikeWrap} ${styles.bike3}`}>
                <BikeSVG color="#b91c1c" />
            </div>

            {/* Road */}
            <div className={styles.road}>
                <div className={styles.roadSurface}>
                    <div className={styles.roadDash} />
                </div>
            </div>

            {/* Login card */}
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <div className={styles.logoWrap}>
                        <div className={styles.logoRing} />
                        <div className={styles.logoRing2} />
                        <span className={styles.logo}>🏍️</span>
                    </div>
                    <h1 className={styles.title}>Honda DMS</h1>
                    <p className={styles.subtitle}>Dealership Management System</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input type="email" className={styles.input}
                            value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="admin@naeem-autos.com" required autoFocus />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Password</label>
                        <input type="password" className={styles.input}
                            value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••" required />
                    </div>

                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? 'Signing in...' : '🔑 Sign In'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p className={styles.footerText}>© 2026 Naeem Autos</p>
                </div>
            </div>
        </div>
    );
}
