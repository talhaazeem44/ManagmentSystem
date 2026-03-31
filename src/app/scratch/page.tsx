'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const PRIZES: Record<string, { label: string; emoji: string; color: string; valid: boolean }> = {
    T: { label: 'FREE TUNING', emoji: '🔧', color: '#10b981', valid: true },
    W: { label: 'FREE BIKE WASH', emoji: '🚿', color: '#3b82f6', valid: true },
    O: { label: 'FREE OIL TOP-UP', emoji: '🛢️', color: '#f59e0b', valid: true },
    D: { label: '10% OFF Next Visit', emoji: '💰', color: '#8b5cf6', valid: true },
    R: { label: 'TRY AGAIN', emoji: '🔁', color: '#6b7280', valid: false },
};

function ScratchCard() {
    const searchParams = useSearchParams();
    const code = searchParams.get('p') || 'R';
    const prize = PRIZES[code] || PRIZES['R'];

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scratched, setScratched] = useState(false);
    const [scratchPercent, setScratchPercent] = useState(0);
    const isDrawing = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Draw silver scratch layer
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#c0c0c0');
        gradient.addColorStop(0.3, '#e8e8e8');
        gradient.addColorStop(0.5, '#a8a8a8');
        gradient.addColorStop(0.7, '#d0d0d0');
        gradient.addColorStop(1, '#b0b0b0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw scratch texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.height; i += 3) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Draw hint text
        ctx.fillStyle = '#666';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '12px Arial';
        ctx.fillText('🪙 Use your finger or coin', canvas.width / 2, canvas.height / 2 + 15);
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    };

    const scratch = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getPos(e, canvas);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
        ctx.fill();

        // Check how much is scratched
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let transparent = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] === 0) transparent++;
        }
        const percent = Math.round((transparent / (canvas.width * canvas.height)) * 100);
        setScratchPercent(percent);
        if (percent > 50) setScratched(true);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>NAEEM AUTOS</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Honda Authorized Dealer</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.75rem', letterSpacing: '1px' }}>
                    ⭐ YOUR LUCKY SCRATCH CARD ⭐
                </div>
            </div>

            {/* Scratch Card */}
            <div style={{
                width: '300px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                background: '#fff',
                position: 'relative'
            }}>
                {/* Prize behind */}
                <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    background: `linear-gradient(135deg, ${prize.color}22, ${prize.color}44)`,
                    minHeight: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{prize.emoji}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: prize.color, letterSpacing: '1px' }}>{prize.label}</div>
                    {prize.valid && (
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                            Show this to claim your reward
                        </div>
                    )}
                </div>

                {/* Scratch overlay canvas */}
                {!scratched && (
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
                        onMouseDown={() => { isDrawing.current = true; }}
                        onMouseUp={() => { isDrawing.current = false; }}
                        onMouseMove={scratch}
                        onTouchStart={() => { isDrawing.current = true; }}
                        onTouchEnd={() => { isDrawing.current = false; }}
                        onTouchMove={scratch}
                    />
                )}
            </div>

            {/* Progress */}
            {!scratched && scratchPercent > 0 && (
                <div style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {scratchPercent < 30 ? 'Keep scratching...' : scratchPercent < 50 ? 'Almost there! 🎉' : ''}
                </div>
            )}

            {/* Revealed */}
            {scratched && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    {prize.valid ? (
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                            🎉 Congratulations! Visit us to claim your reward!
                        </div>
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            Better luck next time! Visit us again 😊
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '2rem', color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
                Valid for 30 days from issue date<br />One reward per customer per visit
            </div>
        </div>
    );
}

export default function ScratchPage() {
    return (
        <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: '50vh' }}>Loading...</div>}>
            <ScratchCard />
        </Suspense>
    );
}
