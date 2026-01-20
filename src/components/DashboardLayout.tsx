'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/inventory', label: 'Inventory', icon: '🏍️' },
        { href: '/inventory/receive', label: 'Receive Stock', icon: '📦' },
        { href: '/sales', label: 'Sales', icon: '💰' },
        { href: '/sales/new', label: 'New Sale', icon: '➕' },
        { href: '/reports', label: 'Reports', icon: '📈' },
        { href: '/workshop', label: 'Workshop', icon: '🛠️' },
    ];

    return (
        <div className={styles.layout}>
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
                    <p className={styles.footerText}>© 2026 Naeem Autos</p>
                </div>
            </aside>

            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>
        </div>
    );
}
