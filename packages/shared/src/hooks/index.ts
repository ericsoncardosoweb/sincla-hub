import { useState, useEffect } from 'react';

/**
 * Detecta se o usuário deu scroll além do threshold.
 * Útil para header sticky, scroll-to-top, etc.
 */
export function useScrollDetection(threshold = 50): boolean {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > threshold);
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // check initial state
        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    return scrolled;
}

/**
 * Detecta o breakpoint atual baseado em media queries.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);
        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

/**
 * Verifica se é mobile (< 768px).
 */
export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 767px)');
}
