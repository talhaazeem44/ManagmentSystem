'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { BIKE_STANDARD_PRICES } from '@/lib/constants';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface Bike {
    id: string;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
    purchasePrice?: number;
    status: string;
    deliveryOrder?: {
        doNumber: string;
    };
}

function getSuggestedPrice(model: string): number {
    // Direct lookup from constants (same source as reports/receipt)
    if (BIKE_STANDARD_PRICES[model]) return BIKE_STANDARD_PRICES[model];
    // Fallback: strip spaces and try again
    const entry = Object.entries(BIKE_STANDARD_PRICES).find(
        ([k]) => k.replace(/\s+/g, '').toUpperCase() === model.replace(/\s+/g, '').toUpperCase()
    );
    return entry ? entry[1] : 0;
}

export default function NewSalePage() {
    const router = useRouter();
    const { toasts, showToast, removeToast } = useToast();
    const [bikes, setBikes] = useState<Bike[]>([]);
    const [doFilter, setDoFilter] = useState('');
    const [selectedBikeId, setSelectedBikeId] = useState('');
    const [selectedBike, setSelectedBike] = useState<Bike | null>(null);

    // Customer fields
    const [cnic, setCnic] = useState('');
    const [cnicLookupStatus, setCnicLookupStatus] = useState<'idle' | 'found' | 'new'>('idle');
    const [name, setName] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [address, setAddress] = useState('');
    const [mobile, setMobile] = useState('');

    // Sale fields
    const [price, setPrice] = useState('');
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [receivedCash, setReceivedCash] = useState('');
    const [balance, setBalance] = useState('');
    const [registrationCost, setRegistrationCost] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [bankTransferAmount, setBankTransferAmount] = useState('');
    const [taxAmount] = useState('1000');
    const [receiptNumber, setReceiptNumber] = useState('...');

    // Auto-calculate balance for credit sales
    useEffect(() => {
        if (paymentMode === 'CREDIT') {
            const p = parseFloat(price) || 0;
            const r = parseFloat(receivedCash) || 0;
            const b = parseFloat(bankTransferAmount) || 0;
            const calc = p - r - b;
            setBalance(calc > 0 ? String(calc) : '0');
        }
    }, [paymentMode, price, receivedCash, bankTransferAmount]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAvailableBikes();
        fetchNextReceiptNumber();
    }, []);

    const fetchNextReceiptNumber = async () => {
        try {
            const res = await fetch('/api/counters?id=saleReceipt');
            if (res.ok) {
                const data = await res.json();
                setReceiptNumber(String(data.next));
            }
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (selectedBikeId) {
            const bike = bikes.find(b => b.id === selectedBikeId);
            setSelectedBike(bike || null);
            if (bike && bike.purchasePrice) {
                const suggested = getSuggestedPrice(bike.model);
                if (suggested > 0) setPrice(String(suggested));
            }
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

    // Unique DO numbers from available bikes
    const uniqueDOs = Array.from(
        new Set(bikes.map(b => b.deliveryOrder?.doNumber).filter(Boolean))
    ) as string[];

    // Bikes filtered by selected DO
    const filteredBikes = doFilter
        ? bikes.filter(b => b.deliveryOrder?.doNumber === doFilter)
        : bikes;

    // When DO filter changes, reset bike selection if it no longer matches
    useEffect(() => {
        if (doFilter && selectedBike && selectedBike.deliveryOrder?.doNumber !== doFilter) {
            setSelectedBikeId('');
        }
    }, [doFilter]);

    // Auto-fill customer info when CNIC is entered
    const handleCnicBlur = async () => {
        const cleaned = cnic.trim();
        if (!cleaned) return;

        try {
            const res = await fetch(`/api/customers?cnic=${encodeURIComponent(cleaned)}`);
            if (res.ok) {
                const customer = await res.json();
                if (customer) {
                    setName(customer.name || '');
                    setFatherName(customer.fatherName || '');
                    setAddress(customer.address || '');
                    setMobile(customer.mobile || '');
                    setCnicLookupStatus('found');
                } else {
                    setCnicLookupStatus('new');
                }
            }
        } catch {
            // silently ignore lookup errors
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
                    advanceAmount: advanceAmount || 0,
                    receivedCash: receivedCash || 0,
                    balance: balance || 0,
                    registrationCost: registrationCost || null,
                    taxAmount: taxAmount || 0,
                    paymentMode,
                    bankTransferAmount: bankTransferAmount || 0,
                    receiptNumber
                })
            });

            if (response.ok) {
                const sale = await response.json();
                showToast('Sale completed successfully!', 'success');
                router.push(`/sales/${sale.id}`);
            } else {
                const error = await response.json();
                showToast(`Error: ${error.message || 'Failed to complete sale'}`, 'error');
            }
        } catch (error) {
            showToast('Failed to submit sale. Please ensure the database is running.', 'error');
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

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Filter by DO Number</label>
                                <select
                                    className="select"
                                    value={doFilter}
                                    onChange={(e) => setDoFilter(e.target.value)}
                                >
                                    <option value="">All DOs</option>
                                    {uniqueDOs.map(doNum => (
                                        <option key={doNum} value={doNum}>{doNum}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="label">Available Bike *</label>
                                <select
                                    className="select"
                                    value={selectedBikeId}
                                    onChange={(e) => setSelectedBikeId(e.target.value)}
                                    required
                                >
                                    <option value="">Select a bike</option>
                                    {filteredBikes.map((bike) => (
                                        <option key={bike.id} value={bike.id}>
                                            {bike.model} - {bike.color} | Engine: {bike.engineNumber} | DO: {bike.deliveryOrder?.doNumber || 'N/A'}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                    <div>
                                        <span style={{ color: 'var(--color-text-muted)' }}>DO Number:</span>
                                        <strong style={{ marginLeft: '0.5rem' }}>{selectedBike.deliveryOrder?.doNumber || 'N/A'}</strong>
                                    </div>
                                    {selectedBike.purchasePrice ? (
                                        <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem', padding: '0.5rem', background: 'rgba(34,197,94,0.08)', borderRadius: '6px', display: 'flex', gap: '1.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                Suggested: <strong style={{ color: 'var(--color-success)' }}>
                                                    {getSuggestedPrice(selectedBike.model).toLocaleString()} PKR
                                                </strong>
                                            </span>
                                        </div>
                                    ) : null}
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
                                    onChange={(e) => { setCnic(e.target.value); setCnicLookupStatus('idle'); }}
                                    onBlur={handleCnicBlur}
                                    placeholder="34601-1181800-1"
                                    required
                                />
                                {cnicLookupStatus === 'found' && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                                        ✓ Returning customer — details auto-filled
                                    </p>
                                )}
                                {cnicLookupStatus === 'new' && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                        New customer
                                    </p>
                                )}
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
                    </div>

                    <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Sale Details
                        </h2>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Price (PKR) *</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="238500"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Registration Fees (PKR)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input"
                                    value={registrationCost}
                                    onChange={(e) => setRegistrationCost(e.target.value)}
                                    placeholder="9000"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Advance Amount / Date</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={advanceAmount}
                                    onChange={(e) => setAdvanceAmount(e.target.value)}
                                    placeholder="06-12-25"
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Received Cash</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input"
                                    value={receivedCash}
                                    onChange={(e) => setReceivedCash(e.target.value)}
                                    placeholder="238500"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">
                                    Balance
                                    {paymentMode === 'CREDIT' && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem', fontWeight: 400 }}>
                                            (auto-calculated)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input"
                                    value={balance}
                                    onChange={(e) => setBalance(e.target.value)}
                                    placeholder="9000"
                                    style={paymentMode === 'CREDIT' ? { background: 'rgba(239,68,68,0.06)', borderColor: '#ef4444', fontWeight: 700 } : undefined}
                                />
                            </div>

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
                                    <option value="ONLINE">Online</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="label">Bank Transfer Amount (PKR)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="input"
                                    value={bankTransferAmount}
                                    onChange={(e) => setBankTransferAmount(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Receipt Number</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={receiptNumber}
                                    readOnly
                                    style={{ background: 'var(--color-surface-hover, rgba(0,0,0,0.05))', cursor: 'not-allowed' }}
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
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
