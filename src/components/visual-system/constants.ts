/**
 * Constantes do Sistema Visual Unificado
 * Sincla Hub - Janeiro 2026
 */

// IDs das seções para tracking
export const SECTION_IDS = {
    HERO: 'hero',
    HOW_IT_WORKS: 'como-funciona',
    PLATFORMS: 'produtos',
    ENTERPRISE: 'empresas',
    PARTNERS: 'parceiros',
    SUPPORT: 'suporte',
    FOOTER: 'footer',
} as const;

// Estado visual por seção
export interface SectionVisualState {
    nodeDensity: number;        // 0-1: quão próximos os nós estão
    connectionIntensity: number; // 0-1: visibilidade das conexões
    depthScale: number;          // 0-1: escala da profundidade
    gridOpacity: number;         // 0-1: opacidade do grid
    rotationOffset: number;      // graus adicionais de rotação
}

export const SECTION_STATES: Record<string, SectionVisualState> = {
    [SECTION_IDS.HERO]: {
        nodeDensity: 0.7,
        connectionIntensity: 0.4,
        depthScale: 1,
        gridOpacity: 0.04,
        rotationOffset: 0,
    },
    [SECTION_IDS.HOW_IT_WORKS]: {
        nodeDensity: 0.85,
        connectionIntensity: 0.7,
        depthScale: 1.1,
        gridOpacity: 0.05,
        rotationOffset: 5,
    },
    [SECTION_IDS.PLATFORMS]: {
        nodeDensity: 0.5,
        connectionIntensity: 0.25,
        depthScale: 0.85,
        gridOpacity: 0.03,
        rotationOffset: -3,
    },
    [SECTION_IDS.ENTERPRISE]: {
        nodeDensity: 0.35,
        connectionIntensity: 0.15,
        depthScale: 0.7,
        gridOpacity: 0.025,
        rotationOffset: -8,
    },
    [SECTION_IDS.PARTNERS]: {
        nodeDensity: 0.3,
        connectionIntensity: 0.1,
        depthScale: 0.6,
        gridOpacity: 0.02,
        rotationOffset: -12,
    },
    [SECTION_IDS.SUPPORT]: {
        nodeDensity: 0.25,
        connectionIntensity: 0.08,
        depthScale: 0.5,
        gridOpacity: 0.015,
        rotationOffset: -15,
    },
    [SECTION_IDS.FOOTER]: {
        nodeDensity: 0.15,
        connectionIntensity: 0.03,
        depthScale: 0.3,
        gridOpacity: 0.01,
        rotationOffset: -18,
    },
};

// Configuração dos nós (módulos Sincla)
export const NODES = [
    { id: 'rh', name: 'RH', color: '#0087ff', angle: 0 },
    { id: 'ead', name: 'EAD', color: '#00c6ff', angle: 72 },
    { id: 'bolso', name: 'Bolso', color: '#00d4aa', angle: 144 },
    { id: 'leads', name: 'Leads', color: '#ff8c00', angle: 216 },
    { id: 'agenda', name: 'Agenda', color: '#a855f7', angle: 288 },
] as const;

// Configuração mobile (3 nós)
export const NODES_MOBILE = [
    { id: 'rh', name: 'RH', color: '#0087ff', angle: 0 },
    { id: 'ead', name: 'EAD', color: '#00c6ff', angle: 120 },
    { id: 'bolso', name: 'Bolso', color: '#00d4aa', angle: 240 },
] as const;

// Parâmetros de performance
export const PERFORMANCE = {
    SCROLL_THROTTLE_MS: 16,      // ~60fps
    MOUSE_THROTTLE_MS: 16,
    RESIZE_DEBOUNCE_MS: 100,
    TRANSITION_DURATION_MS: 800,
    MOBILE_BREAKPOINT: 768,
} as const;

// Estado padrão para seções não mapeadas
export const DEFAULT_STATE: SectionVisualState = {
    nodeDensity: 0.5,
    connectionIntensity: 0.3,
    depthScale: 0.8,
    gridOpacity: 0.03,
    rotationOffset: 0,
};
