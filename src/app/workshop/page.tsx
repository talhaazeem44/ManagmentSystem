'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ServiceReceipt from '@/components/ServiceReceipt';

interface ServiceRecord {
    _id?: string;
    customerName: string;
    customerMobile: string;
    bikeNumber: string;
    serviceType: string;
    description: string;
    amount: number;
    date: string;
}

export default function WorkshopPage() {
    const [history, setHistory] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [printingService, setPrintingService] = useState<ServiceRecord | null>(null);
    const [formData, setFormData] = useState({
        customerName: '',
        customerMobile: '',
        bikeNumber: '',
        serviceType: 'Tuning',
        description: '',
        amount: ''
    });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/workshop');
            if (res.ok) setHistory(await res.json());
        } catch (e) {
            console.error('Failed to fetch workshop history');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/workshop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: Number(formData.amount),
                    date: new Date()
                })
            });

            if (res.ok) {
                const newRecord = await res.json();
                setHistory([newRecord, ...history]);
                setFormData({
                    customerName: '',
                    customerMobile: '',
                    bikeNumber: '',
                    serviceType: 'Tuning',
                    description: '',
                    amount: ''
                });

                // Trigger Print
                setPrintingService(newRecord);
                setTimeout(() => {
                    window.print();
                    setPrintingService(null);
                }, 100);
            }
        } catch (error) {
            alert('Failed to save service record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>Workshop Services</h1>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                    {/* New Service Form */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>New Service Bill</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Customer Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    required
                                    value={formData.customerName}
                                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Mobile Number</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.customerMobile}
                                    onChange={e => setFormData({ ...formData, customerMobile: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Bike Number (e.g. SIAL-2345)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.bikeNumber}
                                    onChange={e => setFormData({ ...formData, bikeNumber: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Service Type</label>
                                <select
                                    className="select"
                                    value={formData.serviceType}
                                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                                >
                                    <option value="Tuning">Tuning</option>
                                    <option value="Oil Change">Oil Change</option>
                                    <option value="Repair">General Repair</option>
                                    <option value="Washing">Washing</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="label">Total Amount (Rs.)</label>
                                <input
                                    type="number"
                                    className="input"
                                    required
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="label">Additional Description</label>
                                <textarea
                                    className="input"
                                    style={{ minHeight: '80px' }}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Saving...' : 'Save & Print Bill'}
                            </button>
                        </form>
                    </div>

                    {/* History */}
                    <div className="card">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Recent Workshop History</h2>
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>Service</th>
                                        <th>Amount</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(record => (
                                        <tr key={record._id}>
                                            <td>{new Date(record.date).toLocaleDateString()}</td>
                                            <td>
                                                <strong>{record.customerName}</strong>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{record.bikeNumber}</div>
                                            </td>
                                            <td>{record.serviceType}</td>
                                            <td>Rs. {record.amount.toLocaleString()}</td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => {
                                                        setPrintingService(record);
                                                        setTimeout(() => {
                                                            window.print();
                                                            setPrintingService(null);
                                                        }, 100);
                                                    }}
                                                >
                                                    🖨️ Re-Print
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Hidden Receipt for Printing */}
                {printingService && <ServiceReceipt service={printingService} />}
            </div>
        </DashboardLayout>
    );
}
