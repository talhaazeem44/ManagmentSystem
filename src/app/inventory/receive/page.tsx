'use client';

import { useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HONDA_BIKE_MODELS, BIKE_COLORS, BIKE_BOOK_PRICES } from '@/lib/constants';
import * as XLSX from 'xlsx';

interface BikeEntry {
    id: string;
    orderNumber: string;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
    purchasePrice: string;
}

// Map AHL model names → our model names
const MODEL_MAP: Record<string, string> = {
    'CD70': 'CD70',
    'CD 70': 'CD70',
    'CD-70': 'CD70',
    'DREAM': 'DREAM',
    'CD DREAM': 'DREAM',
    'PRIDOR': 'PRIDOR',
    'CG125': 'CG 125',
    'CG 125': 'CG 125',
    'CG-125': 'CG 125',
    'CG125S': 'CG125S.SE',
    'CG125S.SE': 'CG125S.SE',
    'CG125 SELF SE': 'CG125S.SE',
    'CG125S GOLD': 'CG125S.SE',
    'CB125F': 'CB125F.SE',
    'CB125F SE': 'CB125F.SE',
    'CB125F.SE': 'CB125F.SE',
    'CB150F': 'CB150F',
    'CB 150F': 'CB150F',
    'CG150': 'CG150 2-Tone',
    'CG150 2TONE': 'CG150 2-Tone',
    'CG150 2-TONE': 'CG150 2-Tone',
};

// Map AHL color names → our color names
const COLOR_MAP: Record<string, string> = {
    'BLK': 'Black',
    'BLACK': 'Black',
    'RED': 'Red',
    'BLUE': 'Blue',
    'BLU': 'Blue',
    'SILVER': 'Silver',
    'SLV': 'Silver',
    'WHITE': 'White',
    'WHT': 'White',
    'GOLD': 'Gold',
    'ORG': 'Orange',
    'ORANGE': 'Orange',
    '2TONE': '2-Tone',
    '2-TONE': '2-Tone',
};

function normalizeModel(raw: string): string {
    if (!raw) return '';
    const upper = raw.trim().toUpperCase();
    // Try direct match first
    for (const [key, val] of Object.entries(MODEL_MAP)) {
        if (upper === key.toUpperCase()) return val;
    }
    // Try partial match
    for (const [key, val] of Object.entries(MODEL_MAP)) {
        if (upper.includes(key.toUpperCase())) return val;
    }
    return raw.trim();
}

function extractColor(modelRaw: string): string {
    const upper = modelRaw.trim().toUpperCase();
    for (const [key, val] of Object.entries(COLOR_MAP)) {
        if (upper.includes(key)) return val;
    }
    return '';
}

function findCol(headers: string[], keywords: string[]): number {
    for (let i = 0; i < headers.length; i++) {
        const h = (headers[i] || '').toString().toUpperCase();
        if (keywords.some(k => h.includes(k.toUpperCase()))) return i;
    }
    return -1;
}

export default function ReceiveInventoryPage() {
    const [doNumber, setDoNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dealerName, setDealerName] = useState('NAEEM AUTOS (SBL)');
    const [dealerAddress, setDealerAddress] = useState('1-5 KM DASKA ROAD, SAMBRIAL, Pakistan');
    const [bikes, setBikes] = useState<BikeEntry[]>([
        { id: '1', orderNumber: '', model: '', color: '', engineNumber: '', chassisNumber: '', purchasePrice: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [doImageUrl, setDoImageUrl] = useState<string | null>(null);
    const [imageConverting, setImageConverting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageConverting(true);
        setDoImageUrl(null);
        setUploadError('');

        try {
            // Convert HEIC → JPEG if needed
            let displayBlob: Blob = file;
            let uploadFile: File = file;

            if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                const heic2any = (await import('heic2any')).default;
                const converted = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob;
                displayBlob = converted;
                uploadFile = new File([converted], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
            }

            // Show preview
            setDoImageUrl(URL.createObjectURL(displayBlob));

            // Send to Claude Vision for OCR
            const formData = new FormData();
            formData.append('image', uploadFile);

            const res = await fetch('/api/parse-do-image', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'OCR failed');

            if (data.bikes && data.bikes.length > 0) {
                const parsed: BikeEntry[] = data.bikes.map((b: any, i: number) => {
                    const model = normalizeModel(b.model || '');
                    return {
                        id: `ocr-${i}`,
                        orderNumber: b.orderNumber || '',
                        model,
                        color: b.color || extractColor(b.model || ''),
                        engineNumber: b.engineNumber || '',
                        chassisNumber: b.chassisNumber || '',
                        purchasePrice: b.purchasePrice || (model && BIKE_BOOK_PRICES[model] ? BIKE_BOOK_PRICES[model].toString() : ''),
                    };
                });
                setBikes(parsed);
            } else {
                setUploadError('No bike data found in image. Fill the form manually.');
            }
        } catch (err: any) {
            setUploadError(`Error: ${err.message || err}`);
            console.error(err);
        } finally {
            setImageConverting(false);
            if (imageRef.current) imageRef.current.value = '';
        }
    };

    const addBikeRow = () => {
        setBikes([...bikes, {
            id: Date.now().toString(),
            orderNumber: '',
            model: '',
            color: '',
            engineNumber: '',
            chassisNumber: '',
            purchasePrice: ''
        }]);
    };

    const removeBikeRow = (id: string) => {
        if (bikes.length > 1) {
            setBikes(bikes.filter(bike => bike.id !== id));
        }
    };

    const updateBike = (id: string, field: keyof BikeEntry, value: string) => {
        setBikes(bikes.map(bike => {
            if (bike.id === id) {
                const updatedBike = { ...bike, [field]: value };
                if (field === 'model' && value && BIKE_BOOK_PRICES[value]) {
                    updatedBike.purchasePrice = BIKE_BOOK_PRICES[value].toString();
                }
                return updatedBike;
            }
            return bike;
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError('');

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                if (rows.length < 2) {
                    setUploadError('File appears empty.');
                    return;
                }

                // Find header row (first row that has "engine" or "chassis" or "model")
                let headerRowIdx = -1;
                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const row = rows[i].map((c: any) => (c || '').toString().toUpperCase());
                    if (row.some(c => c.includes('ENGINE') || c.includes('CHASSIS') || c.includes('MODEL'))) {
                        headerRowIdx = i;
                        break;
                    }
                }

                if (headerRowIdx === -1) {
                    setUploadError('Could not find header row. Make sure the file has columns like Engine No, Chassis No, Model.');
                    return;
                }

                const headers = rows[headerRowIdx].map((c: any) => (c || '').toString());
                const colModel    = findCol(headers, ['MODEL', 'DESCRIPTION', 'VARIANT']);
                const colEngine   = findCol(headers, ['ENGINE', 'ENG NO', 'ENGINE NO', 'ENGINE NUMBER']);
                const colChassis  = findCol(headers, ['CHASSIS', 'FRAME', 'CHASSIS NO', 'CHASSIS NUMBER']);
                const colPrice    = findCol(headers, ['UNIT PRICE', 'PRICE', 'AMOUNT', 'EX-FACTORY', 'BOOKING']);
                const colOrder    = findCol(headers, ['ORDER', 'BOOKING NO', 'SR', 'S.NO', 'SR NO']);

                if (colEngine === -1 || colChassis === -1) {
                    setUploadError('Could not find Engine or Chassis columns in the file.');
                    return;
                }

                const newBikes: BikeEntry[] = [];
                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    const engineNo = (row[colEngine] || '').toString().trim();
                    const chassisNo = (row[colChassis] || '').toString().trim();
                    if (!engineNo && !chassisNo) continue; // skip empty rows

                    const rawModel = colModel >= 0 ? (row[colModel] || '').toString().trim() : '';
                    const model = normalizeModel(rawModel);
                    const color = extractColor(rawModel);
                    const rawPrice = colPrice >= 0 ? (row[colPrice] || '').toString().replace(/,/g, '').trim() : '';
                    const purchasePrice = rawPrice || (model && BIKE_BOOK_PRICES[model] ? BIKE_BOOK_PRICES[model].toString() : '');
                    const orderNumber = colOrder >= 0 ? (row[colOrder] || '').toString().trim() : '';

                    newBikes.push({
                        id: `upload-${i}`,
                        orderNumber,
                        model,
                        color,
                        engineNumber: engineNo,
                        chassisNumber: chassisNo,
                        purchasePrice,
                    });
                }

                if (newBikes.length === 0) {
                    setUploadError('No bike data found in the file.');
                    return;
                }

                setBikes(newBikes);
                // Reset file input
                if (fileRef.current) fileRef.current.value = '';
            } catch (err) {
                setUploadError('Failed to parse file. Make sure it is a valid Excel (.xlsx) file.');
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
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
                setDoNumber('');
                setDate(new Date().toISOString().split('T')[0]);
                setBikes([{ id: '1', orderNumber: '', model: '', color: '', engineNumber: '', chassisNumber: '', purchasePrice: '' }]);
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

                {/* Upload Section */}
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        Upload DO File
                    </h2>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {/* Excel upload */}
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                Excel (.xlsx) — auto-fills all bike rows
                            </p>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload} style={{ display: 'none' }} id="do-file-upload" />
                            <label htmlFor="do-file-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                                📊 Choose Excel File
                            </label>
                            {bikes.some(b => b.engineNumber) && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600, marginLeft: '0.75rem' }}>
                                    ✓ {bikes.length} bikes loaded
                                </span>
                            )}
                        </div>

                        {/* Image / HEIC upload */}
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                Photo (.heic / .jpg) — view while filling manually
                            </p>
                            <input ref={imageRef} type="file" accept=".heic,.heif,image/*"
                                onChange={handleImageUpload} style={{ display: 'none' }} id="do-image-upload" />
                            <label htmlFor="do-image-upload" className="btn btn-secondary" style={{ cursor: imageConverting ? 'not-allowed' : 'pointer', opacity: imageConverting ? 0.7 : 1 }}>
                                {imageConverting ? '⏳ Scanning...' : '📷 Scan DO Photo'}
                            </label>
                            {doImageUrl && (
                                <button type="button" className="btn" onClick={() => setDoImageUrl(null)}
                                    style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {uploadError && (
                        <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {uploadError}</p>
                    )}

                    {/* Show DO photo */}
                    {doImageUrl && (
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                DO Document — use this as reference while filling the form below
                            </p>
                            <img src={doImageUrl} alt="DO Document"
                                onError={() => setUploadError('Browser cannot display this image. Try converting to JPG on your iPhone before sending.')}
                                style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--color-border)', maxHeight: '600px', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

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
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                Bikes <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({bikes.length})</span>
                            </h2>
                            <button type="button" onClick={addBikeRow} className="btn btn-secondary">
                                ➕ Add Bike
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {bikes.map((bike, idx) => (
                                <div key={bike.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Bike #{idx + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeBikeRow(bike.id)}
                                            className="btn"
                                            disabled={bikes.length === 1}
                                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                        >🗑️ Remove</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem' }}>Order No.</label>
                                            <input type="text" className="input" value={bike.orderNumber}
                                                onChange={(e) => updateBike(bike.id, 'orderNumber', e.target.value)}
                                                placeholder="AHL/MC/2349" />
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem' }}>Model *</label>
                                            <select className="select" value={bike.model} required
                                                onChange={(e) => updateBike(bike.id, 'model', e.target.value)}>
                                                <option value="">Select Model</option>
                                                {HONDA_BIKE_MODELS.map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem' }}>Color *</label>
                                            <select className="select" value={bike.color} required
                                                onChange={(e) => updateBike(bike.id, 'color', e.target.value)}>
                                                <option value="">Select Color</option>
                                                {BIKE_COLORS.map(color => (
                                                    <option key={color} value={color}>{color}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem' }}>Engine Number *</label>
                                            <input type="text" className="input" value={bike.engineNumber}
                                                onChange={(e) => updateBike(bike.id, 'engineNumber', e.target.value)}
                                                placeholder="V690222" required />
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem' }}>Chassis Number *</label>
                                            <input type="text" className="input" value={bike.chassisNumber}
                                                onChange={(e) => updateBike(bike.id, 'chassisNumber', e.target.value)}
                                                placeholder="047" required />
                                        </div>
                                        <div>
                                            <label className="label" style={{ fontSize: '0.75rem' }}>Booking Amount *</label>
                                            <input type="number" className="input" value={bike.purchasePrice}
                                                onChange={(e) => updateBike(bike.id, 'purchasePrice', e.target.value)}
                                                placeholder="Purchase Price" required />
                                        </div>
                                    </div>
                                </div>
                            ))}
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
