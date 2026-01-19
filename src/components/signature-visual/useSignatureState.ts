import { useState, useEffect, useCallback, useRef } from 'react';
import {
    SECTION_STATES,
    DEFAULT_STATE,
    PERFORMANCE,
    SECTIONS,
    type SignatureState,
} from './constants';

interface UseSignatureStateReturn {
    state: SignatureState;
    scrollProgress: number;
    activeSection: string;
    isMobile: boolean;
    isTablet: boolean;
    prefersReducedMotion: boolean;
}

/**
 * Hook que gerencia o estado da assinatura visual
 * Reage ao scroll, detecta seções e interpola estados
 */
export function useSignatureState(): UseSignatureStateReturn {
    const [state, setState] = useState<SignatureState>(SECTION_STATES[SECTIONS.HERO] || DEFAULT_STATE);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeSection, setActiveSection] = useState<string>(SECTIONS.HERO);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    const rafRef = useRef<number | null>(null);

    // Detectar preferência de movimento reduzido
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Detectar breakpoints
    useEffect(() => {
        const checkBreakpoints = () => {
            const width = window.innerWidth;
            setIsMobile(width < PERFORMANCE.MOBILE_BREAKPOINT);
            setIsTablet(width >= PERFORMANCE.MOBILE_BREAKPOINT && width < PERFORMANCE.TABLET_BREAKPOINT);
        };

        checkBreakpoints();

        let timeoutId: number;
        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(checkBreakpoints, PERFORMANCE.RESIZE_DEBOUNCE);
        };

        window.addEventListener('resize', debouncedResize);
        return () => {
            window.removeEventListener('resize', debouncedResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Interpolação suave entre estados
    const interpolateState = useCallback(
        (from: SignatureState, to: SignatureState, progress: number): SignatureState => {
            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

            // Easing mais suave para transições orgânicas
            const easeInOutCubic = (t: number) =>
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const easedProgress = easeInOutCubic(progress);

            return {
                nucleusScale: lerp(from.nucleusScale, to.nucleusScale, easedProgress),
                nucleusOpacity: lerp(from.nucleusOpacity, to.nucleusOpacity, easedProgress),
                orbitScale: lerp(from.orbitScale, to.orbitScale, easedProgress),
                orbitOpacity: lerp(from.orbitOpacity, to.orbitOpacity, easedProgress),
                visibleSatellites: Math.round(lerp(from.visibleSatellites, to.visibleSatellites, easedProgress)),
                activeModules: progress < 0.5 ? from.activeModules : to.activeModules,
                connectionIntensity: lerp(from.connectionIntensity, to.connectionIntensity, easedProgress),
                moduleOrbitRadius: lerp(from.moduleOrbitRadius, to.moduleOrbitRadius, easedProgress),
            };
        },
        []
    );

    // Handler de scroll
    useEffect(() => {
        const sectionIds = Object.values(SECTIONS).filter(id => id !== SECTIONS.FOOTER);

        const handleScroll = () => {
            if (rafRef.current) return;

            rafRef.current = requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progress = Math.min(1, Math.max(0, scrollTop / docHeight));

                setScrollProgress(progress);

                // Detectar seção ativa
                const viewportMiddle = scrollTop + window.innerHeight * 0.4;
                let currentSection: string = SECTIONS.HERO;
                let nextSection: string = SECTIONS.HERO;
                let transitionProgress = 0;

                for (let i = 0; i < sectionIds.length; i++) {
                    const element = document.getElementById(sectionIds[i]);
                    if (!element) continue;

                    const rect = element.getBoundingClientRect();
                    const elementTop = scrollTop + rect.top;
                    const elementBottom = elementTop + rect.height;

                    if (viewportMiddle >= elementTop && viewportMiddle < elementBottom) {
                        currentSection = sectionIds[i];
                        const sectionProgress = (viewportMiddle - elementTop) / rect.height;

                        if (sectionProgress > 0.6 && i < sectionIds.length - 1) {
                            nextSection = sectionIds[i + 1];
                            transitionProgress = (sectionProgress - 0.6) / 0.4;
                        } else {
                            nextSection = currentSection;
                            transitionProgress = 0;
                        }
                        break;
                    }
                }

                // Footer
                if (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 200) {
                    currentSection = SECTIONS.FOOTER;
                    nextSection = SECTIONS.FOOTER;
                    transitionProgress = 0;
                }

                setActiveSection(currentSection);

                // Interpolar estado
                const fromState = SECTION_STATES[currentSection] || DEFAULT_STATE;
                const toState = SECTION_STATES[nextSection] || DEFAULT_STATE;
                const newState = interpolateState(fromState, toState, transitionProgress);

                setState(newState);
                rafRef.current = null;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [interpolateState]);

    return {
        state,
        scrollProgress,
        activeSection,
        isMobile,
        isTablet,
        prefersReducedMotion,
    };
}
