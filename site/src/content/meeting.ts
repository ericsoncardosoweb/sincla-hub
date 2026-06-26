import type { ProductId } from './products';

export type MeetingIntent = ProductId | 'consultor' | 'unknown';

export type TeamSize = '1-10' | '11-50' | '51+';

export type SchedulePreference = 'morning' | 'afternoon' | 'any' | 'whatsapp-only';

export interface MeetingIntentOption {
  id: MeetingIntent;
  icon: string;
  label: string;
  description: string;
}

export const MEETING_INTENTS: MeetingIntentOption[] = [
  {
    id: 'rh',
    icon: '👥',
    label: 'Organizar RH da minha empresa',
    description: 'Colaboradores, avaliações, PDIs e rotinas do dia a dia',
  },
  {
    id: 'talento',
    icon: '🎯',
    label: 'Contratar melhor',
    description: 'Vagas, triagem de candidatos e funil de seleção',
  },
  {
    id: 'ead',
    icon: '🎓',
    label: 'Treinar a equipe',
    description: 'Trilhas, certificados e universidade corporativa',
  },
  {
    id: 'consultor',
    icon: '🤝',
    label: 'Sou consultor — quero revender',
    description: 'Programa de parceiros e comissionamento',
  },
  {
    id: 'unknown',
    icon: '💬',
    label: 'Ainda não sei — me ajudem',
    description: 'Conversa rápida para entender o melhor caminho',
  },
];

export const TEAM_SIZE_OPTIONS: { value: TeamSize; label: string }[] = [
  { value: '1-10', label: '1 a 10 pessoas' },
  { value: '11-50', label: '11 a 50 pessoas' },
  { value: '51+', label: 'Mais de 50 pessoas' },
];

export const SCHEDULE_OPTIONS: { value: SchedulePreference; label: string }[] = [
  { value: 'morning', label: 'Manhã (9h–12h)' },
  { value: 'afternoon', label: 'Tarde (14h–17h)' },
  { value: 'any', label: 'Qualquer horário' },
  { value: 'whatsapp-only', label: 'Prefiro conversar no WhatsApp' },
];

export const MEETING_STEPS = ['Objetivo', 'Seus dados', 'Horário'] as const;
