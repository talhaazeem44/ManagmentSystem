'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface BikeEntry {
    id: string;
    orderNumber: string;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
}

export default function ReceiveInventoryPage() {
    const [doNumber, setDoNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dealerName, setDealerName] = useState('Messers NAEEM AUTOS (SBL)');
    const [dealerAddress, setDealerAddress] = useState('1-5 KM DASKA ROAD, SAMBRIAL, Pakistan');
    const [bikes, setBikes] = useState<BikeEntry[]>([
        { id: '1', orderNumber: '', model: '', color: '', engineNumber: '', chassisNumber: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addBikeRow = () => {
        setBikes([...bikes, {
            id: Date.now().toString(),
            orderNumber: '',
            model: '',
            color: '',
            engineNumber: '',
            chassisNumber: ''
        }]);
    };

    const removeBikeRow = (id: string) => {
        if (bikes.length > 1) {
            setBikes(bikes.filter(bike => bike.id !== id));
        }
    };

    const updateBike = (id: string, field: keyof BikeEntry, value: string) => {
        setBikes(bikes.map(bike =>
            bike.id === id ? { ...bike, [field]: value } : bike
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/delivery-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doNumber,
                    date,
                    dealerName,
                    dealerAddress,
                    bikes: bikes.map(({ id, ...bike }) => bike)
                })
            });

            if (response.ok) {
                alert('Delivery Order received successfully!');
                // Reset form
                setDoNumber('');
                setDate(new Date().toISOString().split('T')[0]);
                setBikes([{ id: '1', orderNumber: '', model: '', color: '', engineNumber: '', chassisNumber: '' }]);
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || 'Failed to save delivery order'}`);
            }
        } catch (error) {
            alert('Failed to submit delivery order. Please ensure the database is running.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Receive Stock</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                    Enter delivery order details and bike information
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Delivery Order Information
                        </h2>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">DO Number *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={doNumber}
                                    onChange={(e) => setDoNumber(e.target.value)}
                                    placeholder="e.g., 960337636"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Date *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Dealer Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={dealerName}
                                    onChange={(e) => setDealerName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Dealer Address *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={dealerAddress}
                                    onChange={(e) => setDealerAddress(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Bikes</h2>
                            <button type="button" onClick={addBikeRow} className="btn btn-secondary">
                                ➕ Add Bike
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Order No.</th>
                                        <th>Model</th>
                                        <th>Color</th>
                                        <th>Engine Number</th>
                                        <th>Chassis Number</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bikes.map((bike) => (
                                        <tr key={bike.id}>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={bike.orderNumber}
                                                    onChange={(e) => updateBike(bike.id, 'orderNumber', e.target.value)}
                                                    placeholder="AHL/MC/2349"
                                                    style={{ minWidth: '120px' }}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="select"
                                                    value={bike.model}
                                                    onChange={(e) => updateBike(bike.id, 'model', e.target.value)}
                                                    required
                                                    style={{ minWidth: '120px' }}
                                                >
                                                    <option value="">Select</option>
                                                    <option value="CD70">CD70</option>
                                                    <option value="CD70 DREAM">CD70 DREAM</option>
                                                    <option value="PRIDOR">PRIDOR</option>
                                                    <option value="CG 125">CG 125</option>
                                                    <option value="CG125S.SE">CG125S.SE</option>
                                                    <option value="CB125F.SE">CB125F.SE</option>
                                                    <option value="CB150F">CB150F</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={bike.color}
                                                    onChange={(e) => updateBike(bike.id, 'color', e.target.value)}
                                                    placeholder="BLK"
                                                    required
                                                    style={{ minWidth: '100px' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={bike.engineNumber}
                                                    onChange={(e) => updateBike(bike.id, 'engineNumber', e.target.value)}
                                                    placeholder="V690222"
                                                    required
                                                    style={{ minWidth: '120px' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={bike.chassisNumber}
                                                    onChange={(e) => updateBike(bike.id, 'chassisNumber', e.target.value)}
                                                    placeholder="047"
                                                    required
                                                    style={{ minWidth: '120px' }}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => removeBikeRow(bike.id)}
                                                    className="btn btn-secondary"
                                                    disabled={bikes.length === 1}
                                                    style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                Total Bikes: <strong style={{ color: 'var(--color-text)' }}>{bikes.length}</strong>
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <span className="spinner"></span>
                                    Saving...
                                </>
                            ) : (
                                <>💾 Save Delivery Order</>
                            )}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                            🖨️ Print Stickers
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
