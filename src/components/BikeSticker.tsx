'use client';

import React from 'react';

interface BikeStickerProps {
    bike: {
        model: string;
        color: string;
        engineNumber: string;
        chassisNumber: string;
        deliveryOrder?: {
            doNumber: string;
        };
    };
}

const BikeSticker: React.FC<BikeStickerProps> = ({ bike }) => {
    return (
        <div className="sticker-container print-only">
            <style jsx>{`
                .sticker-container {
                    width: 80mm;
                    padding: 8mm 5mm;
                    background: white;
                    color: black;
                    font-family: 'Inter', sans-serif;
                    border: 1px dashed #ccc;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }

                .dealer-name {
                    font-size: 10pt;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin-bottom: 4mm;
                    opacity: 0.8;
                }

                .do-label {
                    font-size: 12pt;
                    font-weight: 500;
                    text-transform: uppercase;
                    margin-bottom: 2mm;
                }

                .do-value {
                    font-size: 36pt;
                    font-weight: 900;
                    line-height: 1;
                    border: 4px solid black;
                    padding: 4mm 8mm;
                    display: inline-block;
                }

                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        background: white;
                    }
                    .sticker-container {
                        border: none;
                        width: 80mm;
                        padding: 12mm 5mm;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="dealer-name">NAEEM AUTOS</div>
            <div className="do-label">Delivery Order</div>
            <div className="do-value">{bike.deliveryOrder?.doNumber || 'N/A'}</div>
        </div>
    );
};

export default BikeSticker;
