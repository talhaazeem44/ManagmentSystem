import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Honda Dealership Management System
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          Comprehensive inventory, sales, and reporting for Naeem Autos
        </p>
        <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}
