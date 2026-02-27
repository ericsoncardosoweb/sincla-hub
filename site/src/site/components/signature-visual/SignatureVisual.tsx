/**
 * SignatureVisual - Sincla Flux (3D Network Ecosystem)
 *
 * Sistema de partículas 3D que materializa o conceito Sincla:
 * - Nós representam pontos de dados (identidade, empresas, módulos)
 * - Conexões representam fluxo de informações
 * - Movimento contínuo = sistema sempre operando
 *
 * @performance Canvas API + requestAnimationFrame
 * @brand Azul Sincla (#0087ff) com profundidade 3D
 */

import { useEffect, useRef } from 'react';
import styles from './SignatureVisual.module.css';

interface Particle {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    size: number;
    baseAlpha: number;
}

// Configurações premium - mais partículas e mais visível
const CONFIG = {
    // Contagem de partículas (aumentado significativamente)
    PARTICLE_COUNT_DESKTOP: 180,
    PARTICLE_COUNT_MOBILE: 80,

    // Distâncias e velocidades
    CONNECTION_DISTANCE: 120,
    ROTATION_SPEED: 0.0003,
    DRIFT_SPEED: 0.12,
    FOCAL_LENGTH: 900,
    BOUNDS: 800,

    // Opacidades - mais visível
    PARTICLE_ALPHA_MIN: 0.15,
    PARTICLE_ALPHA_MAX: 0.55,
    CONNECTION_ALPHA_MAX: 0.18,

    // Cores Sincla
    COLOR_PRIMARY: { r: 0, g: 135, b: 255 },
    COLOR_SECONDARY: { r: 0, g: 198, b: 255 },
    COLOR_ACCENT: { r: 100, g: 180, b: 255 },
} as const;

export function SignatureVisual() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particles = useRef<Particle[]>([]);
    const animationFrameId = useRef<number>(0);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });

    const initParticles = (width: number, height: number, count: number) => {
        const newParticles: Particle[] = [];
        const spread = Math.max(width, height) * 1.4;

        for (let i = 0; i < count; i++) {
            // Distribuição em 5 camadas de profundidade para maior densidade
            const layerCount = 5;
            const layer = Math.floor(i / (count / layerCount));
            const zRanges = [
                [-400, -200],  // Camada muito distante
                [-200, 0],     // Camada distante
                [0, 200],      // Camada média
                [200, 400],    // Camada próxima
                [400, 600],    // Camada muito próxima
            ];
            const zRange = zRanges[Math.min(layer, layerCount - 1)];

            // Variação de tamanho baseada na camada
            const sizeMultiplier = 1 + (layer / layerCount) * 0.5;

            newParticles.push({
                x: (Math.random() - 0.5) * spread,
                y: (Math.random() - 0.5) * spread,
                z: zRange[0] + Math.random() * (zRange[1] - zRange[0]),
                vx: (Math.random() - 0.5) * CONFIG.DRIFT_SPEED,
                vy: (Math.random() - 0.5) * CONFIG.DRIFT_SPEED,
                vz: (Math.random() - 0.5) * CONFIG.DRIFT_SPEED * 0.3,
                size: (1.5 + Math.random() * 2.5) * sizeMultiplier,
                baseAlpha: 0.5 + Math.random() * 0.5,
            });
        }
        particles.current = newParticles;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let cx = 0;
        let cy = 0;

        const handleResize = () => {
            width = container.clientWidth;
            height = container.clientHeight;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            cx = width / 2;
            cy = height / 2;

            const isMobile = width < 768;
            initParticles(
                width,
                height,
                isMobile ? CONFIG.PARTICLE_COUNT_MOBILE : CONFIG.PARTICLE_COUNT_DESKTOP
            );
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = {
                x: e.clientX / width,
                y: e.clientY / height,
            };
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Ordenar por profundidade (mais distantes primeiro)
            particles.current.sort((a, b) => b.z - a.z);

            const cosRot = Math.cos(CONFIG.ROTATION_SPEED);
            const sinRot = Math.sin(CONFIG.ROTATION_SPEED);

            // Influência sutil do mouse no centro de rotação
            const mouseInfluence = 0.1;
            const offsetX = (mouseRef.current.x - 0.5) * 100 * mouseInfluence;
            const offsetY = (mouseRef.current.y - 0.5) * 100 * mouseInfluence;

            particles.current.forEach((p, i) => {
                // Rotação em torno do eixo Y
                const newX = p.x * cosRot - p.z * sinRot;
                const newZ = p.z * cosRot + p.x * sinRot;
                p.x = newX;
                p.z = newZ;

                // Drift lento
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;

                // Loop nos limites
                const bounds = CONFIG.BOUNDS;
                if (p.x > bounds) p.x = -bounds;
                if (p.x < -bounds) p.x = bounds;
                if (p.y > bounds) p.y = -bounds;
                if (p.y < -bounds) p.y = bounds;
                if (p.z > bounds) p.z = -bounds;
                if (p.z < -bounds) p.z = bounds;

                // Projeção 3D -> 2D
                const perspective = CONFIG.FOCAL_LENGTH / (CONFIG.FOCAL_LENGTH + p.z);
                if (perspective <= 0 || perspective > 3) return;

                const screenX = cx + (p.x + offsetX) * perspective;
                const screenY = cy + (p.y + offsetY) * perspective;

                // Alpha baseado em profundidade (mais perto = mais visível)
                const depthNormalized = (p.z + bounds) / (bounds * 2);
                const depthAlpha = CONFIG.PARTICLE_ALPHA_MIN +
                    (CONFIG.PARTICLE_ALPHA_MAX - CONFIG.PARTICLE_ALPHA_MIN) * (1 - depthNormalized);
                const alpha = depthAlpha * p.baseAlpha;

                // Desenhar conexões
                for (let j = i + 1; j < particles.current.length; j++) {
                    const p2 = particles.current[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dz = p.z - p2.z;
                    const distSq = dx * dx + dy * dy + dz * dz;
                    const maxDistSq = CONFIG.CONNECTION_DISTANCE * CONFIG.CONNECTION_DISTANCE;

                    if (distSq < maxDistSq) {
                        const dist = Math.sqrt(distSq);
                        const perspective2 = CONFIG.FOCAL_LENGTH / (CONFIG.FOCAL_LENGTH + p2.z);
                        if (perspective2 <= 0) continue;

                        const screenX2 = cx + (p2.x + offsetX) * perspective2;
                        const screenY2 = cy + (p2.y + offsetY) * perspective2;

                        // Opacidade da conexão baseada em distância e profundidade
                        const distanceFactor = 1 - (dist / CONFIG.CONNECTION_DISTANCE);
                        const avgDepth = (depthNormalized + (p2.z + bounds) / (bounds * 2)) / 2;
                        const linkAlpha = distanceFactor * CONFIG.CONNECTION_ALPHA_MAX * (1 - avgDepth * 0.5);

                        // Gradiente de cor baseado em profundidade
                        const colorMix = avgDepth;
                        const r = Math.round(CONFIG.COLOR_PRIMARY.r + (CONFIG.COLOR_SECONDARY.r - CONFIG.COLOR_PRIMARY.r) * colorMix);
                        const g = Math.round(CONFIG.COLOR_PRIMARY.g + (CONFIG.COLOR_SECONDARY.g - CONFIG.COLOR_PRIMARY.g) * colorMix);
                        const b = Math.round(CONFIG.COLOR_PRIMARY.b + (CONFIG.COLOR_SECONDARY.b - CONFIG.COLOR_PRIMARY.b) * colorMix);

                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${linkAlpha})`;
                        ctx.lineWidth = Math.max(0.5, 1.5 * Math.min(perspective, perspective2));
                        ctx.moveTo(screenX, screenY);
                        ctx.lineTo(screenX2, screenY2);
                        ctx.stroke();
                    }
                }

                // Desenhar partícula
                const particleSize = p.size * perspective;

                // Glow com efeito glassmorphism (blur visual)
                if (alpha > 0.1) {
                    // Glow externo difuso (simula blur)
                    const glowSize = particleSize * 5;
                    const gradient = ctx.createRadialGradient(
                        screenX, screenY, 0,
                        screenX, screenY, glowSize
                    );
                    gradient.addColorStop(0, `rgba(${CONFIG.COLOR_PRIMARY.r}, ${CONFIG.COLOR_PRIMARY.g}, ${CONFIG.COLOR_PRIMARY.b}, ${alpha * 0.4})`);
                    gradient.addColorStop(0.3, `rgba(${CONFIG.COLOR_SECONDARY.r}, ${CONFIG.COLOR_SECONDARY.g}, ${CONFIG.COLOR_SECONDARY.b}, ${alpha * 0.2})`);
                    gradient.addColorStop(0.6, `rgba(${CONFIG.COLOR_ACCENT.r}, ${CONFIG.COLOR_ACCENT.g}, ${CONFIG.COLOR_ACCENT.b}, ${alpha * 0.08})`);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(screenX - glowSize, screenY - glowSize, glowSize * 2, glowSize * 2);
                }

                // Núcleo brilhante da partícula
                const coreGradient = ctx.createRadialGradient(
                    screenX, screenY, 0,
                    screenX, screenY, particleSize
                );
                coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
                coreGradient.addColorStop(0.3, `rgba(${CONFIG.COLOR_SECONDARY.r}, ${CONFIG.COLOR_SECONDARY.g}, ${CONFIG.COLOR_SECONDARY.b}, ${alpha})`);
                coreGradient.addColorStop(1, `rgba(${CONFIG.COLOR_PRIMARY.r}, ${CONFIG.COLOR_PRIMARY.g}, ${CONFIG.COLOR_PRIMARY.b}, ${alpha * 0.5})`);

                ctx.beginPath();
                ctx.fillStyle = coreGradient;
                ctx.arc(screenX, screenY, particleSize, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId.current = requestAnimationFrame(render);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
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
