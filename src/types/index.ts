export type PlatformType = 'rh' | 'ead' | 'bolso' | 'leads' | 'agenda' | 'intranet';

export interface Platform {
    id: PlatformType;
    name: string;
    tagline: string;
    description: string;
    color: string;
    icon: string;
    logo?: string;
    url: string;
    features: string[];
    isComingSoon?: boolean;
}

export interface HubUser {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PlatformConnection {
    id: string;
    hubUserId: string;
    platform: PlatformType;
    externalUserId: string | null;
    connectedAt: string;
    lastSyncAt: string | null;
    subscriptionStatus: 'active' | 'trial' | 'inactive' | 'cancelled';
    subscriptionPlan: string | null;
}

export interface PartnerLevel {
    id: string;
    name: string;
    commission: number;
    requirements: string;
    benefits: string[];
}

export interface Testimonial {
    id: string;
    name: string;
    role: string;
    company: string;
    avatar: string;
    quote: string;
    platform: PlatformType;
}

export interface PricingPlan {
    id: string;
    platform: PlatformType;
    name: string;
    price: number;
    period: 'monthly' | 'yearly';
    features: string[];
    isPopular?: boolean;
}
