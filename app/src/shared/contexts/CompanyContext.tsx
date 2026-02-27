import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth, type Company, type CompanyMember } from './AuthContext';

interface CompanyContextType {
    // Current company data
    company: Company | null;
    membership: CompanyMember | null;

    // Computed values
    isOwner: boolean;
    isAdmin: boolean;
    isManager: boolean;
    canManageTeam: boolean;
    canManageSettings: boolean;
    canManageBilling: boolean;

    // Branding
    branding: {
        logo: string | null;
        favicon: string | null;
        primaryColor: string;
        secondaryColor: string;
        name: string;
    };

    // CSS variables for theming
    cssVariables: Record<string, string>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
    const { currentCompany, currentMembership } = useAuth();

    const isOwner = currentMembership?.role === 'owner';
    const isAdmin = currentMembership?.role === 'admin' || isOwner;
    const isManager = currentMembership?.role === 'manager' || isAdmin;

    const canManageTeam = isAdmin;
    const canManageSettings = isAdmin;
    const canManageBilling = isOwner;

    const branding = useMemo(() => ({
        logo: currentCompany?.logo_url || null,
        favicon: currentCompany?.favicon_url || null,
        primaryColor: currentCompany?.primary_color || '#0087ff',
        secondaryColor: currentCompany?.secondary_color || '#ff8c00',
        name: currentCompany?.name || 'Sincla',
    }), [currentCompany]);

    const cssVariables = useMemo(() => ({
        '--company-primary': branding.primaryColor,
        '--company-secondary': branding.secondaryColor,
        '--company-primary-rgb': hexToRgb(branding.primaryColor),
        '--company-secondary-rgb': hexToRgb(branding.secondaryColor),
    }), [branding]);

    const value: CompanyContextType = {
        company: currentCompany,
        membership: currentMembership,
        isOwner,
        isAdmin,
        isManager,
        canManageTeam,
        canManageSettings,
        canManageBilling,
        branding,
        cssVariables,
    };

    return (
        <CompanyContext.Provider value={value}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '0, 135, 255'; // Fallback
}

// Hook for applying company branding to document
export function useCompanyBranding() {
    const { branding, cssVariables } = useCompany();

    // Apply CSS variables to document
    useMemo(() => {
        Object.entries(cssVariables).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });

        // Update favicon if available
        if (branding.favicon) {
            const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
                || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = branding.favicon;
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        // Update document title
        if (branding.name) {
            document.title = `${branding.name} | Sincla Hub`;
        }
    }, [branding, cssVariables]);

    return branding;
}
