import { useMemo } from 'react';
import { useVisualSystem } from './useVisualSystem';
import { NODES, NODES_MOBILE } from './constants';
import classes from './VisualSystem.module.css';

/**
 * Sistema Visual Unificado - Sincla Hub
 *
 * Um sistema de animação 3D contínuo que permeia toda a experiência do site.
 * - Reage ao scroll com transições suaves entre estados
 * - Parallax sutil no mouse (desktop)
 * - Nós representando os módulos do ecossistema
 * - Conexões que pulsam sutilmente
 * - Grid de profundidade 3D
 *
 * Performance: CSS puro + JS vanilla, 0 dependências
 * Acessibilidade: Respeita prefers-reduced-motion
 */
export function VisualSystem() {
    const {
        scrollProgress,
        visualState,
        mousePosition,
        isMobile,
        prefersReducedMotion,
    } = useVisualSystem();

    // Selecionar nós baseado no dispositivo
    const nodes = useMemo(() => {
        return isMobile ? NODES_MOBILE : NODES;
    }, [isMobile]);

    // Calcular posições dos nós para conexões
    const nodePositions = useMemo(() => {
        const orbitRadius = isMobile ? 120 : 180;
        const scale = visualState.depthScale;

        return nodes.map((node) => {
            const angleRad = (node.angle * Math.PI) / 180;
            const x = Math.cos(angleRad) * orbitRadius * scale;
            const y = Math.sin(angleRad) * orbitRadius * scale * 0.5; // Perspectiva
            return { x: 50 + x * 0.15, y: 50 + y * 0.15 }; // Normalizado para viewport %
        });
    }, [nodes, visualState.depthScale, isMobile]);

    // Calcular variáveis CSS dinâmicas
    const systemStyle = useMemo(() => {
        const mouseTiltX = prefersReducedMotion ? 0 : mousePosition.y * 3;
        const mouseTiltY = prefersReducedMotion ? 0 : mousePosition.x * 5;
        const gradientX = 50 + mousePosition.x * 10;
        const gradientY = 30 - scrollProgress * 20 + mousePosition.y * 5;

        return {
            '--grid-opacity': visualState.gridOpacity,
            '--grid-translate-y': `${scrollProgress * 100}px`,
            '--mouse-tilt-x': `${mouseTiltX}deg`,
            '--mouse-tilt-y': `${mouseTiltY}deg`,
            '--rotation-offset': `${visualState.rotationOffset}deg`,
            '--depth-scale': visualState.depthScale,
            '--node-opacity': 0.4 + visualState.nodeDensity * 0.5,
            '--connection-intensity': visualState.connectionIntensity,
            '--connection-opacity': 0.05 + visualState.connectionIntensity * 0.1,
            '--gradient-x': `${gradientX}%`,
            '--gradient-y': `${gradientY}%`,
            '--orbit-radius': isMobile ? '120px' : '180px',
        } as React.CSSProperties;
    }, [
        mousePosition,
        scrollProgress,
        visualState,
        prefersReducedMotion,
        isMobile,
    ]);

    // Converter cor hex para RGB
    const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0, 135, 255';
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    };

    return (
        <div
            className={`${classes.visualSystem} ${prefersReducedMotion ? classes.reducedMotion : ''}`}
            style={systemStyle}
            aria-hidden="true"
            role="presentation"
        >
            {/* Layer 0: Gradient Base */}
            <div className={classes.gradientLayer} />

            {/* Layer 1: Grid de Profundidade */}
            <div className={classes.gridLayer}>
                <div className={classes.gridInner} />
            </div>

            {/* Layer 2: Nós do Ecossistema */}
            <div className={classes.nodesLayer}>
                <div className={classes.nodesContainer}>
                    {nodes.map((node) => (
                        <div
                            key={node.id}
                            className={classes.node}
                            style={{
                                '--node-angle': `${node.angle}deg`,
                                '--node-color-rgb': hexToRgb(node.color),
                            } as React.CSSProperties}
                        >
                            <div className={classes.nodeGlow} />
                            <div className={classes.nodeInner}>
                                <img
                                    src={`/logos/sincla-${node.id}.svg`}
                                    alt=""
                                    className={classes.nodeLogo}
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Layer 3: Conexões entre Nós */}
            <div className={classes.connectionsLayer}>
                <svg
                    className={classes.connectionsSvg}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {/* Conexões base */}
                    {nodePositions.map((pos, i) => {
                        const nextPos = nodePositions[(i + 1) % nodePositions.length];
                        return (
                            <line
                                key={`conn-${i}`}
                                className={classes.connection}
                                x1={`${pos.x}%`}
                                y1={`${pos.y}%`}
                                x2={`${nextPos.x}%`}
                                y2={`${nextPos.y}%`}
                            />
                        );
                    })}

                    {/* Conexões com pulso (apenas desktop e se intensidade > 0.2) */}
                    {!isMobile && visualState.connectionIntensity > 0.2 && (
                        <>
                            {nodePositions.map((pos, i) => {
                                const nextPos = nodePositions[(i + 1) % nodePositions.length];
                                return (
                                    <line
                                        key={`pulse-${i}`}
                                        className={classes.connectionPulse}
                                        x1={`${pos.x}%`}
                                        y1={`${pos.y}%`}
                                        x2={`${nextPos.x}%`}
                                        y2={`${nextPos.y}%`}
                                        style={{
                                            animationDelay: `${i * 0.8}s`,
                                        }}
                                    />
                                );
                            })}
                        </>
                    )}

                    {/* Conexão central - todos os nós ao centro */}
                    {nodePositions.map((pos, i) => (
                        <line
                            key={`center-${i}`}
                            className={classes.connection}
                            x1={`${pos.x}%`}
                            y1={`${pos.y}%`}
                            x2="50%"
                            y2="50%"
                            style={{
                                opacity: visualState.connectionIntensity * 0.5,
                            }}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}
