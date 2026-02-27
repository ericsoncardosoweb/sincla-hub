import { useEffect, useRef } from 'react';

/**
 * Hook para ativar animações de reveal no scroll
 * Inspirado na suavidade do site da Atlassian
 *
 * @param threshold - Porcentagem do elemento visível para ativar (0-1)
 * @param rootMargin - Margem para antecipar/atrasar a ativação
 */
export function useScrollReveal(
    threshold = 0.15,
    rootMargin = '0px 0px -50px 0px'
) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Verifica se o usuário prefere movimento reduzido
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) {
            element.classList.add('visible');
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        // Opcional: parar de observar após revelar
                        // observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin]);

    return ref;
}

/**
 * Hook para revelar múltiplos elementos de uma vez
 * Útil para grids de cards
 */
export function useScrollRevealGroup(
    selector = '.reveal',
    threshold = 0.1,
    rootMargin = '0px 0px -30px 0px'
) {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        const elements = container.querySelectorAll(selector);

        if (prefersReducedMotion) {
            elements.forEach((el) => el.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        elements.forEach((el) => observer.observe(el));

        return () => {
            observer.disconnect();
        };
    }, [selector, threshold, rootMargin]);

    return containerRef;
}
