import type { MeetingIntent } from '../../content/meeting';
import { useConversion } from '../../conversion/ConversionProvider';
import { Button, Card, Container, Section } from '../../design-system/components';
import classes from './MeetingCtaBlock.module.css';

interface MeetingCtaBlockProps {
  variant?: 'default' | 'consultor' | 'product';
  intent?: MeetingIntent;
  title?: string;
  subtitle?: string;
}

export function MeetingCtaBlock({
  variant = 'default',
  intent,
  title,
  subtitle,
}: MeetingCtaBlockProps) {
  const { openMeetingWizard } = useConversion();

  const copy = {
    default: {
      title: title || 'Prefere conversar antes de testar?',
      subtitle:
        subtitle ||
        'Agende 20 minutos com nossa equipe. Explicamos qual módulo faz sentido para sua operação — sem compromisso.',
    },
    consultor: {
      title: title || 'É consultor ou representante?',
      subtitle:
        subtitle ||
        'Converse sobre o programa de parceiros, comissionamento e como apresentar a Sincla aos seus clientes.',
    },
    product: {
      title: title || 'Quer ver este módulo na prática?',
      subtitle:
        subtitle ||
        'Mostramos o fluxo real da plataforma e tiramos dúvidas sobre implantação na sua empresa.',
    },
  }[variant];

  return (
    <Section variant="accent" id="agendar">
      <Container size="md">
        <Card padding="lg" className={classes.card}>
          <div className={classes.content}>
            <p className="ds-eyebrow">Conversa gratuita</p>
            <h2 className={`ds-heading ${classes.title}`}>{copy.title}</h2>
            <p className={`ds-body ${classes.subtitle}`}>{copy.subtitle}</p>
            <div className={classes.actions}>
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  openMeetingWizard({
                    intent: intent || (variant === 'consultor' ? 'consultor' : undefined),
                    source: window.location.pathname,
                  })
                }
              >
                Agendar conversa de 20 min
              </Button>
              <p className="ds-microcopy">Resposta em até 24h · WhatsApp ou e-mail</p>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
