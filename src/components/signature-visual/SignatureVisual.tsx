/**
 * SignatureVisual - Sincla Flux (3D Ecosystem)
 * 
 * Sistema de partículas 3D proprietário que simula a integração
 * e o fluxo contínuo do ecossistema Sincla.
 * 
 * @performance Optimized with Canvas API & RequestAnimationFrame
 */

import { useEffect, useRef } from 'react';
import styles from './SignatureVisual.module.css';

interface Point3D {
    x: number;
    y: number;
    z: number;
}

interface Particle extends Point3D {
    vx: number;
    vy: number;
    vz: number;
    size: number;
}

const PARTICLE_COUNT_DESKTOP = 100;
const PARTICLE_COUNT_MOBILE = 40;
const CONNECTION_DISTANCE = 150;
const ROTATION_SPEED = 0.001;
const FOCAL_LENGTH = 800;
const COLOR_PRIMARY = { r: 0, g: 135, b: 255 }; // Sincla Blue #0087ff

export function SignatureVisual() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particles = useRef<Particle[]>([]);
    const animationFrameId = useRef<number>(0);

    // Inicialização das partículas
    const initParticles = (width: number, height: number, count: number) => {
        const newParticles: Particle[] = [];
        // Spread particles in a 3D cohesive cloud
        const spread = Math.min(width, height) * 1.5;

        for (let i = 0; i < count; i++) {
            newParticles.push({
                x: (Math.random() - 0.5) * spread,
                y: (Math.random() - 0.5) * spread,
                z: (Math.random() - 0.5) * spread,
                vx: (Math.random() - 0.5) * 0.2, // Slow drift
                vy: (Math.random() - 0.5) * 0.2,
                vz: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 2 + 1, // 1px to 3px
            });
        }
        particles.current = newParticles;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let cx = 0;
        let cy = 0;

        // Resize Helper
        const handleResize = () => {
            width = container.clientWidth;
            height = container.clientHeight;

            // Handle HiDPI displays
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            cx = width / 2;
            cy = height / 2;

            const isMobile = width < 768;
            initParticles(width, height, isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP);
        };

        // Render Loop
        const render = () => {
            // Clear canvas but keep context opacity clean
            ctx.clearRect(0, 0, width, height);

            // Opacity Logic: we want 3D sorted drawing or distinct passes?
            // Simple depth-sorting usually looks better for opacity blending
            particles.current.sort((a, b) => b.z - a.z);

            // Update & Rotate Logic
            const cosRot = Math.cos(ROTATION_SPEED);
            const sinRot = Math.sin(ROTATION_SPEED);

            particles.current.forEach((p, i) => {
                // Rotation around Y axis
                const x = p.x * cosRot - p.z * sinRot;
                const z = p.z * cosRot + p.x * sinRot;
                p.x = x;
                p.z = z;

                // Drift
                p.x += p.vx;
                p.y += p.vy;

                // Bounds loop (keep them inside the volume)
                const bounds = 800;
                if (p.x > bounds) p.x = -bounds;
                if (p.x < -bounds) p.x = bounds;
                if (p.y > bounds) p.y = -bounds;
                if (p.y < -bounds) p.y = bounds;
                if (p.z > bounds) p.z = -bounds;
                if (p.z < -bounds) p.z = bounds;

                // Projection
                const perspective = FOCAL_LENGTH / (FOCAL_LENGTH + p.z);

                // Don't draw if behind camera or too close
                if (perspective < 0) return;

                const screenX = cx + p.x * perspective;
                const screenY = cy + p.y * perspective;

                // Depth Opacity (Fog)
                // Normalize Z: -800 to 800 -> alpha 1 to 0
                // We want distant things to be invisible
                const alpha = Math.max(0.05, Math.min(0.4, (p.z + 1000) / 2000));

                // Draw Connections
                // We verify connections against unsorted active subset to save some perf?
                // For simplified visual, we just check neighbours in the array or spatial grid.
                // Simple version: Check all vs all? N^2 is fine for N=100.
                for (let j = i + 1; j < particles.current.length; j++) {
                    const p2 = particles.current[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dz = p.z - p2.z;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    // 3D Distance check
                    if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
                        const dist = Math.sqrt(distSq);
                        const perspective2 = FOCAL_LENGTH / (FOCAL_LENGTH + p2.z);
                        if (perspective2 < 0) continue;

                        const screenX2 = cx + p2.x * perspective2;
                        const screenY2 = cy + p2.y * perspective2;

                        // Connection opacity based on distance between points
                        const linkAlpha = (1 - dist / CONNECTION_DISTANCE) * 0.15 * alpha; // VERY subtle lines

                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${COLOR_PRIMARY.r}, ${COLOR_PRIMARY.g}, ${COLOR_PRIMARY.b}, ${linkAlpha})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(screenX, screenY);
                        ctx.lineTo(screenX2, screenY2);
                        ctx.stroke();
                    }
                }

                // Draw Particle
                ctx.beginPath();
                ctx.fillStyle = `rgba(${COLOR_PRIMARY.r}, ${COLOR_PRIMARY.g}, ${COLOR_PRIMARY.b}, ${alpha})`;
                ctx.arc(screenX, screenY, p.size * perspective, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId.current = requestAnimationFrame(render);
        };

        // Bootstrap
        handleResize();
        window.addEventListener('resize', handleResize);
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.canvasContainer}
            aria-hidden="true"
        >
            <canvas ref={canvasRef} className={styles.canvas} />
        </div>
    );
}
