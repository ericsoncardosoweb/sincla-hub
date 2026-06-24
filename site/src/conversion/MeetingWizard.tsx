import { useState } from 'react';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconCalendar, IconX } from '@tabler/icons-react';
import {
  MEETING_INTENTS,
  MEETING_STEPS,
  SCHEDULE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  type MeetingIntent,
  type SchedulePreference,
  type TeamSize,
} from '../content/meeting';
import { submitMeetingRequest } from './meetingService';
import type { MeetingConfirmation } from './types';
import classes from './MeetingWizard.module.css';

interface MeetingWizardProps {
  initialIntent?: MeetingIntent;
  source: string;
  onClose: () => void;
  onComplete: () => void;
}

interface FormValues {
  intent: MeetingIntent | null;
  name: string;
  phone: string;
  email: string;
  company: string;
  teamSize: TeamSize | '';
  schedulePreference: SchedulePreference | '';
}

export function MeetingWizard({ initialIntent, source, onClose, onComplete }: MeetingWizardProps) {
  const [step, setStep] = useState(initialIntent ? 1 : 0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<MeetingConfirmation | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      intent: initialIntent ?? null,
      name: '',
      phone: '',
      email: '',
      company: '',
      teamSize: '',
      schedulePreference: '',
    },
    validate: {
      name: (value) => (step === 1 && value.trim().length < 2 ? 'Informe seu nome' : null),
      phone: (value) => (step === 1 && value.replace(/\D/g, '').length < 10 ? 'WhatsApp inválido' : null),
      company: (value) => (step === 1 && value.trim().length < 2 ? 'Informe a empresa' : null),
      teamSize: (value) => (step === 1 && !value ? 'Selecione o tamanho da equipe' : null),
      schedulePreference: (value) => (step === 2 && !value ? 'Escolha uma preferência' : null),
    },
  });

  const handleNext = () => {
    if (step === 0 && !form.values.intent) {
      form.setFieldError('intent', 'Escolha uma opção');
      return;
    }

    const fieldByStep: (keyof FormValues)[][] = [[], ['name', 'phone', 'company', 'teamSize'], ['schedulePreference']];
    const errors = form.validate();
    const stepFields = fieldByStep[step] || [];
    const hasStepError = stepFields.some((field) => errors.errors[field]);

    if (hasStepError) return;

    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }

    void handleSubmit();
  };

  const handleSubmit = async () => {
    if (!form.values.intent || !form.values.teamSize || !form.values.schedulePreference) return;

    setSubmitting(true);
    try {
      const result = await submitMeetingRequest({
        intent: form.values.intent,
        contact: {
          name: form.values.name.trim(),
          phone: form.values.phone.trim(),
          email: form.values.email.trim() || undefined,
          company: form.values.company.trim(),
        },
        teamSize: form.values.teamSize as TeamSize,
        schedulePreference: form.values.schedulePreference as SchedulePreference,
        source: { page: source, referrer: document.referrer || undefined },
      });
      setConfirmation(result);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      onClose();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  if (confirmation && step === 3) {
    return (
      <div className={classes.shell}>
        <header className={classes.header}>
          <div className={classes.headerTop}>
            <IconCalendar size={22} className={classes.headerIcon} />
            <button type="button" className={classes.closeBtn} onClick={onComplete} aria-label="Fechar">
              <IconX size={20} />
            </button>
          </div>
        </header>
        <div className={classes.body}>
          <div className={classes.successIcon}>✓</div>
          <h3 className={classes.successTitle}>Pedido recebido</h3>
          <p className={classes.successText}>{confirmation.message}</p>
          <div className={classes.successActions}>
            {confirmation.whatsappUrl && (
              <a className={classes.actionWhatsapp} href={confirmation.whatsappUrl} target="_blank" rel="noopener noreferrer">
                Abrir WhatsApp
              </a>
            )}
            <button type="button" className={classes.actionSecondary} onClick={onComplete}>
              Voltar ao site
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.shell}>
      <header className={classes.header}>
        <div className={classes.headerTop}>
          <div>
            <p className={classes.eyebrow}>Agendar conversa</p>
            <h2 className={classes.headerTitle}>Conversa de 20 minutos</h2>
          </div>
          <button type="button" className={classes.closeBtn} onClick={onClose} aria-label="Fechar">
            <IconX size={20} />
          </button>
        </div>
        <div className={classes.progress} role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
          {MEETING_STEPS.map((label, index) => (
            <span key={label} className={`${classes.dot} ${index <= step ? classes.dotActive : ''}`} title={label} />
          ))}
        </div>
      </header>

      <div className={classes.body}>
        {step === 0 && (
          <>
            <h3 className={classes.stepTitle}>O que você busca?</h3>
            <p className={classes.stepHint}>Escolha a opção mais próxima. Leva menos de 1 minuto.</p>
            <div className={classes.intentGrid}>
              {MEETING_INTENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${classes.intentCard} ${form.values.intent === option.id ? classes.intentCardActive : ''}`}
                  onClick={() => form.setFieldValue('intent', option.id)}
                >
                  <span className={classes.intentIcon}>{option.icon}</span>
                  <span className={classes.intentLabel}>{option.label}</span>
                  <span className={classes.intentDesc}>{option.description}</span>
                </button>
              ))}
            </div>
            {form.errors.intent && <p className={classes.error}>{form.errors.intent}</p>}
          </>
        )}

        {step === 1 && (
          <>
            <h3 className={classes.stepTitle}>Seus dados</h3>
            <p className={classes.stepHint}>Usamos só para entrar em contato. Sem spam.</p>
            <div className={classes.formGrid}>
              <label className={classes.field}>
                <span>Nome completo</span>
                <input {...form.getInputProps('name')} placeholder="Seu nome" autoComplete="name" />
              </label>
              <label className={classes.field}>
                <span>WhatsApp</span>
                <input {...form.getInputProps('phone')} placeholder="(11) 99999-9999" autoComplete="tel" inputMode="tel" />
              </label>
              <label className={classes.field}>
                <span>Empresa</span>
                <input {...form.getInputProps('company')} placeholder="Nome da empresa" autoComplete="organization" />
              </label>
              <label className={classes.field}>
                <span>E-mail (opcional)</span>
                <input {...form.getInputProps('email')} placeholder="seu@email.com" autoComplete="email" />
              </label>
              <fieldset className={classes.fieldset}>
                <legend>Tamanho da equipe</legend>
                <div className={classes.chipRow}>
                  {TEAM_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${classes.chip} ${form.values.teamSize === opt.value ? classes.chipActive : ''}`}
                      onClick={() => form.setFieldValue('teamSize', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className={classes.stepTitle}>Quando podemos conversar?</h3>
            <p className={classes.stepHint}>Escolha uma preferência. Confirmamos o horário por WhatsApp.</p>
            <div className={classes.chipColumn}>
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${classes.scheduleChip} ${form.values.schedulePreference === opt.value ? classes.chipActive : ''}`}
                  onClick={() => form.setFieldValue('schedulePreference', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.errors.schedulePreference && <p className={classes.error}>{form.errors.schedulePreference}</p>}
          </>
        )}
      </div>

      <footer className={classes.footer}>
        <button type="button" className={classes.actionGhost} onClick={handleBack}>
          <IconArrowLeft size={18} />
          {step === 0 ? 'Cancelar' : 'Voltar'}
        </button>
        <button type="button" className={classes.actionPrimary} onClick={handleNext} disabled={submitting}>
          {step === 2 ? (submitting ? 'Enviando…' : 'Confirmar pedido') : 'Continuar'}
        </button>
      </footer>
    </div>
  );
}
