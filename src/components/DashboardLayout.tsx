'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as any)?.role as string | undefined;

    const mainNavItems = [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/sales/new', label: 'New Sale', icon: '➕' },
        { href: '/advance-bookings', label: 'Advance', icon: '📋' },
        { href: '/inventory', label: 'Inventory', icon: '🏍️' },
        { href: '/inventory/receive', label: 'Receive', icon: '📦' },
        { href: '/sales', label: 'Sales', icon: '💰' },
        { href: '/reports', label: 'Reports', icon: '📈' },
    ];

    const workshopNavItems = [
        { href: '/workshop', label: 'Workshop', icon: '🛠️' },
        { href: '/workshop/stock', label: 'W. Stock', icon: '🔩' },
    ];

    let navItems;
    if (role === 'workshop') {
        navItems = workshopNavItems;
    } else if (role === 'admin') {
        navItems = [...mainNavItems, ...workshopNavItems];
    } else {
        navItems = mainNavItems;
    }

    return (
        <div className={styles.layout}>
            {/* Desktop sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>🏍️</div>
                    <h1 className={styles.logoText}>Honda DMS</h1>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        Logout
                    </button>
                    <p className={styles.footerText}>© 2026 Naeem Autos</p>
                </div>
            </aside>

            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>

            {/* Mobile bottom navigation */}
            <nav className={styles.bottomNav}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.bottomNavItem} ${pathname === item.href ? styles.bottomNavItemActive : ''}`}
                    >
                        <span className={styles.bottomNavIcon}>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
