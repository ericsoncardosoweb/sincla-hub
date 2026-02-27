import { useState, useEffect, useCallback, useRef } from 'react';
import {
    SECTION_STATES,
    DEFAULT_STATE,
    PERFORMANCE,
    type SectionVisualState,
} from './constants';

interface VisualSystemState {
    scrollProgress: number;
    activeSection: string;
    visualState: SectionVisualState;
    mousePosition: { x: number; y: number };
    isMobile: boolean;
    prefersReducedMotion: boolean;
}

/**
 * Hook principal do Sistema Visual
 * Gerencia scroll, mouse, seções e estados visuais
 */
export function useVisualSystem(): VisualSystemState {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeSection, setActiveSection] = useState('hero');
    const [visualState, setVisualState] = useState<SectionVisualState>(
        SECTION_STATES.hero || DEFAULT_STATE
    );
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isMobile, setIsMobile] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    const rafRef = useRef<number | null>(null);
    const lastScrollRef = useRef(0);

    // Detectar preferências de movimento reduzido
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Detectar mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= PERFORMANCE.MOBILE_BREAKPOINT);
        };

        checkMobile();

        let timeoutId: number;
        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(checkMobile, PERFORMANCE.RESIZE_DEBOUNCE_MS);
        };

        window.addEventListener('resize', debouncedResize);
        return () => {
            window.removeEventListener('resize', debouncedResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Interpolação suave entre estados
    const interpolateState = useCallback(
        (from: SectionVisualState, to: SectionVisualState, progress: number): SectionVisualState => {
            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
            const easeInOut = (t: number) => t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const easedProgress = easeInOut(progress);

            return {
                nodeDensity: lerp(from.nodeDensity, to.nodeDensity, easedProgress),
                connectionIntensity: lerp(from.connectionIntensity, to.connectionIntensity, easedProgress),
                depthScale: lerp(from.depthScale, to.depthScale, easedProgress),
                gridOpacity: lerp(from.gridOpacity, to.gridOpacity, easedProgress),
                rotationOffset: lerp(from.rotationOffset, to.rotationOffset, easedProgress),
            };
        },
        []
    );

    // Handler de scroll com RAF
    useEffect(() => {
        const sections = [
            'hero',
            'como-funciona',
            'produtos',
            'empresas',
            'parceiros',
            'suporte',
        ];

        const handleScroll = () => {
            if (rafRef.current) return;

            rafRef.current = requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progress = Math.min(1, Math.max(0, scrollTop / docHeight));

                setScrollProgress(progress);

                // Detectar seção ativa
                const viewportMiddle = scrollTop + window.innerHeight / 2;
                let currentSection = 'hero';
                let nextSection = 'hero';
                let transitionProgress = 0;

                for (let i = 0; i < sections.length; i++) {
                    const element = document.getElementById(sections[i]);
                    if (!element) continue;

                    const rect = element.getBoundingClientRect();
                    const elementTop = scrollTop + rect.top;
                    const elementBottom = elementTop + rect.height;

                    if (viewportMiddle >= elementTop && viewportMiddle < elementBottom) {
                        currentSection = sections[i];

                        // Calcular progresso dentro da seção
                        const sectionProgress = (viewportMiddle - elementTop) / rect.height;

                        // Se estiver na segunda metade, começar transição para próxima
                        if (sectionProgress > 0.5 && i < sections.length - 1) {
                            nextSection = sections[i + 1];
                            transitionProgress = (sectionProgress - 0.5) * 2;
                        } else {
                            nextSection = currentSection;
                            transitionProgress = 0;
                        }
                        break;
                    }
                }

                // Footer
                if (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 100) {
                    currentSection = 'footer';
                    nextSection = 'footer';
                }

                setActiveSection(currentSection);

                // Interpolar estado visual
                const fromState = SECTION_STATES[currentSection] || DEFAULT_STATE;
                const toState = SECTION_STATES[nextSection] || DEFAULT_STATE;
                const newState = interpolateState(fromState, toState, transitionProgress);

                setVisualState(newState);

                lastScrollRef.current = scrollTop;
                rafRef.current = null;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Estado inicial

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [interpolateState]);

    // Handler de mouse (desktop apenas)
    useEffect(() => {
        if (isMobile || prefersReducedMotion) return;

        let lastUpdate = 0;

        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            if (now - lastUpdate < PERFORMANCE.MOUSE_THROTTLE_MS) return;
            lastUpdate = now;

            // Normalizar posição (-1 a 1)
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;

            setMousePosition({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isMobile, prefersReducedMotion]);

    return {
        scrollProgress,
        activeSection,
        visualState,
        mousePosition,
        isMobile,
        prefersReducedMotion,
    };
}
