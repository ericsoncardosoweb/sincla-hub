/**
 * Assinatura Visual Sincla - Constantes
 * Sistema gravitacional de identidade
 */

// Seções do site (IDs devem corresponder aos IDs dos elementos HTML)
export const SECTIONS = {
    HERO: 'hero',
    HOW_IT_WORKS: 'como-funciona',
    PLATFORMS: 'produtos',
    ENTERPRISE: 'empresas',
    PARTNERS: 'parceiros',
    SUPPORT: 'suporte',
    FOOTER: 'footer',
} as const;

// Módulos Sincla com suas cores
export const MODULES = [
    { id: 'rh', color: '#0087ff', angle: 0 },
    { id: 'ead', color: '#00c6ff', angle: 72 },
    { id: 'bolso', color: '#00d4aa', angle: 144 },
    { id: 'leads', color: '#ff8c00', angle: 216 },
    { id: 'agenda', color: '#a855f7', angle: 288 },
] as const;

// Módulos para mobile (reduzido)
export const MODULES_MOBILE = [
    { id: 'rh', color: '#0087ff', angle: 0 },
    { id: 'ead', color: '#00c6ff', angle: 120 },
    { id: 'bolso', color: '#00d4aa', angle: 240 },
] as const;

// Estado visual por seção
export interface SignatureState {
    nucleusScale: number;
    nucleusOpacity: number;
    orbitScale: number;
    orbitOpacity: number;
    visibleSatellites: number;
    activeModules: string[];
    connectionIntensity: number;
    moduleOrbitRadius: number;
}

export const SECTION_STATES: Record<string, SignatureState> = {
    [SECTIONS.HERO]: {
        nucleusScale: 1.0,
        nucleusOpacity: 1.0,
        orbitScale: 1.0,
        orbitOpacity: 0.06,
        visibleSatellites: 1,
        activeModules: ['rh', 'ead', 'bolso', 'leads', 'agenda'],
        connectionIntensity: 0.5,
        moduleOrbitRadius: 1.0,
    },
    [SECTIONS.HOW_IT_WORKS]: {
        nucleusScale: 0.9,
        nucleusOpacity: 0.9,
        orbitScale: 1.1,
        orbitOpacity: 0.08,
        visibleSatellites: 1,
        activeModules: ['rh', 'ead', 'bolso'],
        connectionIntensity: 0.8,
        moduleOrbitRadius: 1.1,
    },
    [SECTIONS.PLATFORMS]: {
        nucleusScale: 0.85,
        nucleusOpacity: 0.75,
        orbitScale: 0.95,
        orbitOpacity: 0.05,
        visibleSatellites: 1,
        activeModules: ['rh'],
        connectionIntensity: 0.4,
        moduleOrbitRadius: 1.3,
    },
    [SECTIONS.ENTERPRISE]: {
        nucleusScale: 0.8,
        nucleusOpacity: 0.85,
        orbitScale: 1.15,
        orbitOpacity: 0.07,
        visibleSatellites: 3,
        activeModules: ['rh', 'ead'],
        connectionIntensity: 0.6,
        moduleOrbitRadius: 0.9,
    },
    [SECTIONS.PARTNERS]: {
        nucleusScale: 0.7,
        nucleusOpacity: 0.6,
        orbitScale: 0.85,
        orbitOpacity: 0.04,
        visibleSatellites: 2,
        activeModules: [],
        connectionIntensity: 0.2,
        moduleOrbitRadius: 0.8,
    },
    [SECTIONS.SUPPORT]: {
        nucleusScale: 0.6,
        nucleusOpacity: 0.5,
        orbitScale: 0.7,
        orbitOpacity: 0.03,
        visibleSatellites: 1,
        activeModules: [],
        connectionIntensity: 0.15,
        moduleOrbitRadius: 0.7,
    },
    [SECTIONS.FOOTER]: {
        nucleusScale: 0.5,
        nucleusOpacity: 0.4,
        orbitScale: 0.6,
        orbitOpacity: 0.02,
        visibleSatellites: 0,
        activeModules: [],
        connectionIntensity: 0.05,
        moduleOrbitRadius: 0.5,
    },
};

// Estado padrão
export const DEFAULT_STATE: SignatureState = {
    nucleusScale: 0.8,
    nucleusOpacity: 0.7,
    orbitScale: 0.9,
    orbitOpacity: 0.04,
    visibleSatellites: 1,
    activeModules: [],
    connectionIntensity: 0.3,
    moduleOrbitRadius: 1.0,
};

// Configurações de órbita (raios em px, correspondendo ao CSS)
export const ORBIT_CONFIG = {
    inner: { radius: 140, duration: 120, direction: 1 },
    middle: { radius: 225, duration: 180, direction: -1 },
    outer: { radius: 310, duration: 240, direction: 1 },
} as const;

// Configurações de satélite (empresas)
export const SATELLITE_CONFIG = [
    { orbitIndex: 0, angleOffset: 0, label: 'Empresa Principal' },
    { orbitIndex: 1, angleOffset: 45, label: 'Filial' },
    { orbitIndex: 2, angleOffset: 180, label: 'Parceiro' },
] as const;

// Performance
export const PERFORMANCE = {
    SCROLL_THROTTLE: 16,
    RESIZE_DEBOUNCE: 150,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
} as const;
