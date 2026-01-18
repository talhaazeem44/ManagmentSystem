'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

interface Bike {
    id: number;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
    status: string;
    deliveryOrder: {
        doNumber: string;
    };
}

export default function NewSalePage() {
    const router = useRouter();
    const [bikes, setBikes] = useState<Bike[]>([]);
    const [selectedBikeId, setSelectedBikeId] = useState('');
    const [selectedBike, setSelectedBike] = useState<Bike | null>(null);

    // Customer fields
    const [cnic, setCnic] = useState('');
    const [name, setName] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [address, setAddress] = useState('');
    const [mobile, setMobile] = useState('');

    // Sale fields
    const [price, setPrice] = useState('');
    const [registrationCost, setRegistrationCost] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [receiptNumber, setReceiptNumber] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAvailableBikes();
    }, []);

    useEffect(() => {
        if (selectedBikeId) {
            const bike = bikes.find(b => b.id === parseInt(selectedBikeId));
            setSelectedBike(bike || null);
        } else {
            setSelectedBike(null);
        }
    }, [selectedBikeId, bikes]);

    const fetchAvailableBikes = async () => {
        try {
            const response = await fetch('/api/bikes');
            if (response.ok) {
                const data = await response.json();
                setBikes(data.filter((bike: Bike) => bike.status === 'AVAILABLE'));
            }
        } catch (error) {
            console.error('Failed to fetch bikes:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bikeId: selectedBikeId,
                    customer: {
                        cnic,
                        name,
                        fatherName,
                        address,
                        mobile
                    },
                    price,
                    registrationCost: registrationCost || null,
                    paymentMode,
                    receiptNumber
                })
            });

            if (response.ok) {
                const sale = await response.json();
                alert('Sale completed successfully!');
                router.push(`/sales/${sale.id}`);
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || 'Failed to complete sale'}`);
            }
        } catch (error) {
            alert('Failed to submit sale. Please ensure the database is running.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>New Sale</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Complete a bike sale and generate receipt
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Select Bike
                        </h2>

                        <div className="form-group">
                            <label className="label">Available Bike *</label>
                            <select
                                className="select"
                                value={selectedBikeId}
                                onChange={(e) => setSelectedBikeId(e.target.value)}
                                required
                            >
                                <option value="">Select a bike</option>
                                {bikes.map((bike) => (
                                    <option key={bike.id} value={bike.id}>
                                        {bike.model} - {bike.color} | Engine: {bike.engineNumber} | DO: {bike.deliveryOrder.doNumber}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedBike && (
                            <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Selected Bike Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)' }}>Model:</span>
                                        <strong style={{ marginLeft: '0.5rem' }}>{selectedBike.model}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)' }}>Color:</span>
                                        <strong style={{ marginLeft: '0.5rem' }}>{selectedBike.color}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)' }}>Engine #:</span>
                                        <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{selectedBike.engineNumber}</code>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)' }}>Chassis #:</span>
                                        <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{selectedBike.chassisNumber}</code>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Customer Information
                        </h2>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">CNIC *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={cnic}
                                    onChange={(e) => setCnic(e.target.value)}
                                    placeholder="34601-1181800-1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Mobile *</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="0307-8745526"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Customer Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Muhammad Rafiq"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Father/Husband Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={fatherName}
                                    onChange={(e) => setFatherName(e.target.value)}
                                    placeholder="Abdul Aziz"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Address</label>
                            <input
                                type="text"
                                className="input"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street, City"
                            />
                        </div>

                        <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                💡 <strong>CNIC Scanning:</strong> OCR integration placeholder - manually enter CNIC for now
                            </p>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Sale Details
                        </h2>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Price (PKR) *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="238500"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Registration Cost (PKR)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={registrationCost}
                                    onChange={(e) => setRegistrationCost(e.target.value)}
                                    placeholder="9000"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Payment Mode *</label>
                                <select
                                    className="select"
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    required
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CREDIT">Credit</option>
                                    <option value="LEASE">Lease</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="label">Receipt Number</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={receiptNumber}
                                    onChange={(e) => setReceiptNumber(e.target.value)}
                                    placeholder="7476"
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <span className="spinner"></span>
                                    Processing...
                                </>
                            ) : (
                                <>✅ Complete Sale</>
                            )}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
