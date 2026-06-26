/**
 * Notification Service — Sincla Hub
 * SDK para envio de notificações via Edge Function centralizada
 * Usado pelo Hub e pode ser usado por ferramentas satélite
 */

import { supabase } from '../lib/supabase';

// =============================================
// Types
// =============================================

export interface SendNotificationOptions {
    channel: 'email' | 'whatsapp' | 'in_app' | 'all';
    to: string;
    subject?: string;
    message: string;
    html?: string;
    template?: 'welcome' | 'system' | 'billing' | 'alert' | 'security' | 'custom';
    data?: Record<string, string>;
    sourceTool?: string;
    companyId?: string;
    category?: string;
    icon?: string;
    color?: string;
    actionUrl?: string;
}

export interface NotificationResult {
    success: boolean;
    results?: Array<{ channel: string; success: boolean; error?: string }>;
    error?: string;
}

export interface Notification {
    id: string;
    user_id: string;
    company_id: string | null;
    title: string;
    message: string;
    category: string;
    icon: string | null;
    color: string;
    action_url: string | null;
    is_read: boolean;
    read_at: string | null;
    source_tool: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

// =============================================
// Send Functions
// =============================================

/**
 * Enviar notificação via Edge Function centralizada
 */
export async function sendNotification(options: SendNotificationOptions): Promise<NotificationResult> {
    try {
        const { data, error } = await supabase.functions.invoke('send-notification', {
            body: {
                channel: options.channel,
                to: options.to,
                subject: options.subject,
                message: options.message,
                html: options.html,
                template: options.template,
                data: options.data,
                source_tool: options.sourceTool || 'hub',
                company_id: options.companyId,
                category: options.category,
                icon: options.icon,
                color: options.color,
                action_url: options.actionUrl,
            },
        });

        if (error) throw new Error(error.message);
        return data as NotificationResult;
    } catch (err: any) {
        console.error('[NotificationService] Erro:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Atalho: Enviar email
 */
export function sendEmail(
    to: string,
    subject: string,
    message: string,
    template?: 'welcome' | 'system' | 'billing' | 'alert' | 'security' | 'custom',
    data?: Record<string, string>,
    companyId?: string,
) {
    return sendNotification({ channel: 'email', to, subject, message, template, data, companyId });
}

/**
 * Atalho: Enviar WhatsApp
 */
export function sendWhatsApp(phone: string, message: string) {
    return sendNotification({ channel: 'whatsapp', to: phone, message });
}

/**
 * Atalho: Enviar notificação in-app
 */
export function sendInAppNotification(
    userId: string,
    title: string,
    message: string,
    options?: { actionUrl?: string; icon?: string; color?: string; category?: string; companyId?: string }
) {
    return sendNotification({
        channel: 'in_app',
        to: userId,
        subject: title,
        message,
        actionUrl: options?.actionUrl,
        icon: options?.icon,
        color: options?.color,
        category: options?.category,
        companyId: options?.companyId,
    });
}

// =============================================
// Read Functions (In-App)
// =============================================

/**
 * Buscar notificações do usuário atual
 */
export async function getNotifications(limit = 20): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[NotificationService] Erro ao buscar notificações:', error);
        return [];
    }
    return data || [];
}

/**
 * Contar notificações não-lidas
 */
export async function getUnreadCount(): Promise<number> {
    const { data, error } = await supabase.rpc('get_unread_notification_count');
    if (error) {
        console.error('[NotificationService] Erro ao contar não-lidas:', error);
        return 0;
    }
    return data || 0;
}

/**
 * Marcar uma notificação como lida
 */
export async function markAsRead(notificationId: string): Promise<void> {
    await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
}

/**
 * Marcar todas como lidas
 */
export async function markAllAsRead(): Promise<void> {
    await supabase.rpc('mark_all_notifications_read');
}

/**
 * Deletar uma notificação
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
}
