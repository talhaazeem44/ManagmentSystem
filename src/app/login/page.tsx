'use client';

import { signIn, getSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginPage() {
    const router   = useRouter();
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [ready,    setReady]    = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setReady(true), 60);
        return () => clearTimeout(t);
    }, []);

    // 3-D tilt on mouse move
    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        let raf = 0;

        const onMove = (e: MouseEvent) => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const r  = wrap.getBoundingClientRect();
                const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
                const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
                wrap.style.transition = 'transform 0.08s linear';
                wrap.style.transform  = `perspective(900px) rotateY(${dx * 7}deg) rotateX(${-dy * 7}deg) scale3d(1.01,1.01,1.01)`;
            });
        };
        const onLeave = () => {
            cancelAnimationFrame(raf);
            wrap.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
            wrap.style.transform  = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
        };

        window.addEventListener('mousemove', onMove);
        wrap.addEventListener('mouseleave', onLeave);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMove);
            wrap.removeEventListener('mouseleave', onLeave);
        };
    }, []);

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
        <div className={styles.root}>

            {/* ── Ambient glow orbs ───────────────────────── */}
            <div className={styles.orb1} />
            <div className={styles.orb2} />
            <div className={styles.orb3} />

            {/* ── Perspective grid ────────────────────────── */}
            <div className={styles.grid} />

            {/* ── Horizontal speed lines ──────────────────── */}
            <div className={styles.linesLayer} aria-hidden>
                {Array.from({ length: 9 }, (_, i) => (
                    <span key={i} className={styles.speedLine} style={{ '--si': i } as React.CSSProperties} />
                ))}
            </div>

            {/* ── Rising particles ────────────────────────── */}
            <div className={styles.particleLayer} aria-hidden>
                {Array.from({ length: 18 }, (_, i) => (
                    <span key={i} className={styles.ptcl} style={{ '--pi': i } as React.CSSProperties} />
                ))}
            </div>

            {/* ── Bike hero ───────────────────────────────── */}
            <div className={`${styles.bikeWrap} ${ready ? styles.bikeIn : ''}`} aria-hidden>
                <div className={styles.bikeGlow} />
                <Image
                    src="/honda-bike.png"
                    alt="Honda"
                    width={940}
                    height={580}
                    className={styles.bikeImg}
                    priority
                    unoptimized
                />
                <div className={styles.groundShadow} />
            </div>

            {/* ── Login card ──────────────────────────────── */}
            <div className={`${styles.cardOuter} ${ready ? styles.cardIn : ''}`} ref={wrapRef}>
                {/* animated gradient border ring */}
                <div className={styles.borderRing} aria-hidden />
                {/* glass content */}
                <div className={styles.card}>
                    {/* top inner highlight */}
                    <div className={styles.cardHighlight} aria-hidden />

                    {/* badge */}
                    <div className={styles.badge}>
                        <span className={styles.badgePulse} />
                        HONDA AUTHORIZED DEALER
                    </div>

                    {/* brand */}
                    <div className={styles.brandRow}>
                        <div className={styles.brandRule} />
                        <h1 className={styles.brand}>
                            <span className={styles.brandWhite}>NAEEM&nbsp;</span>
                            <span className={styles.brandRed}>AUTOS</span>
                        </h1>
                        <div className={`${styles.brandRule} ${styles.brandRuleR}`} />
                    </div>
                    <p className={styles.tagline}>Dealership Management System</p>

                    {/* form */}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.errBox}>
                                <span className={styles.errIcon}>!</span>
                                {error}
                            </div>
                        )}

                        <div className={styles.field}>
                            <label className={styles.flabel}>Email Address</label>
                            <div className={styles.inputWrap}>
                                <svg className={styles.inputSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <input type="email" className={styles.input} value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@naeem-autos.com" required autoFocus />
                                <div className={styles.inputBar} />
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.flabel}>Password</label>
                            <div className={styles.inputWrap}>
                                <svg className={styles.inputSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                <input type="password" className={styles.input} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" required />
                                <div className={styles.inputBar} />
                            </div>
                        </div>

                        <button type="submit" className={styles.btn} disabled={loading}>
                            <span className={styles.btnFill} />
                            <span className={styles.btnShine} />
                            <span className={styles.btnLabel}>
                                {loading
                                    ? <><span className={styles.spin} />SIGNING IN...</>
                                    : <>ACCESS SYSTEM
                                        <svg className={styles.btnArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                      </>
                                }
                            </span>
                        </button>
                    </form>

                    <div className={styles.foot}>
                        <span className={styles.footLine} />
                        © 2026 Naeem Autos
                        <span className={styles.footLine} />
                    </div>
                </div>
            </div>

        </div>
    );
}
