import {
    IconBell, IconUsers, IconPlugConnected, IconSettings, IconSparkles, IconMail,
} from '@tabler/icons-react';

export const dashboardShortcuts = [
    {
        icon: IconBell,
        label: 'Notificações e e-mail',
        path: '/painel/configuracoes?aba=notificacoes',
    },
    {
        icon: IconUsers,
        label: 'Equipe',
        path: '/painel/equipe',
    },
    {
        icon: IconPlugConnected,
        label: 'Integrações',
        path: '/painel/integracoes',
    },
    {
        icon: IconSettings,
        label: 'Configurações',
        path: '/painel/configuracoes',
    },
    {
        icon: IconSparkles,
        label: 'Recursos e uso',
        path: '/painel/assinaturas?aba=recursos',
    },
    {
        icon: IconMail,
        label: 'Contatos',
        path: '/painel/contatos',
    },
] as const;
