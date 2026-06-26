import { SITE } from '../content/site';
import type { MeetingConfirmation, MeetingRequest } from './types';

function generateId() {
  return `mr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildWhatsAppUrl(request: MeetingRequest): string {
  const intentLabels: Record<string, string> = {
    rh: 'Organizar RH',
    talento: 'Contratar melhor',
    ead: 'Treinar equipe',
    consultor: 'Programa de consultor',
    unknown: 'Ainda não definiu',
  };

  const scheduleLabels: Record<string, string> = {
    morning: 'Manhã (9h–12h)',
    afternoon: 'Tarde (14h–17h)',
    any: 'Qualquer horário',
    'whatsapp-only': 'Prefere WhatsApp',
  };

  const text = [
    'Olá! Gostaria de agendar uma conversa sobre a Sincla.',
    '',
    `Nome: ${request.contact.name}`,
    `Empresa: ${request.contact.company}`,
    `WhatsApp: ${request.contact.phone}`,
    request.contact.email ? `E-mail: ${request.contact.email}` : null,
    `Interesse: ${intentLabels[request.intent] || request.intent}`,
    `Equipe: ${request.teamSize}`,
    `Preferência: ${scheduleLabels[request.schedulePreference]}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export async function submitMeetingRequest(request: MeetingRequest): Promise<MeetingConfirmation> {
  const id = generateId();
  const whatsappUrl = buildWhatsAppUrl(request);

  const payload = {
    event: 'meeting.requested',
    id,
    timestamp: new Date().toISOString(),
    data: request,
    whatsapp: {
      to: SITE.whatsappNumber,
      preview: whatsappUrl,
    },
  };

  if (SITE.meetingWebhookUrl) {
    try {
      await fetch(SITE.meetingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('[Sincla] Falha ao enviar webhook de reunião:', error);
    }
  } else {
    console.info('[Sincla] Pedido de reunião (webhook não configurado):', payload);
  }

  return {
    id,
    message: 'Recebemos seu pedido. Nossa equipe entrará em contato em até 24 horas úteis.',
    whatsappUrl,
  };
}
