import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Overview of your dealership operations
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: '2rem' }}>
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Inventory</h3>
                            <span style={{ fontSize: '1.5rem' }}>🏍️</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text)' }}>-</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>Available bikes</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales Today</h3>
                            <span style={{ fontSize: '1.5rem' }}>💰</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-success)' }}>-</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>Bikes sold</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Today</h3>
                            <span style={{ fontSize: '1.5rem' }}>📈</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>-</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>PKR</p>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending DOs</h3>
                            <span style={{ fontSize: '1.5rem' }}>📦</span>
                        </div>
                        <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>-</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-subtle)', marginTop: '0.5rem' }}>To process</p>
                    </div>
                </div>

                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h2>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <a href="/inventory/receive" className="btn btn-primary">📦 Receive Stock</a>
                        <a href="/sales/new" className="btn btn-success">➕ New Sale</a>
                        <a href="/reports" className="btn btn-secondary">📊 View Reports</a>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-warning)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚠️ Database Connection Required
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        Start the PostgreSQL database to enable full functionality. Run: <code style={{ background: 'var(--color-bg-elevated)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>docker compose up -d</code>
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
