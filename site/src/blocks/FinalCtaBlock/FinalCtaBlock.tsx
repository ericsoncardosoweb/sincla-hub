import { IconArrowRight } from '@tabler/icons-react';
import { SITE } from '../../content/site';
import { useConversion } from '../../conversion/ConversionProvider';
import { Button, Container, Section } from '../../design-system/components';
import classes from './FinalCtaBlock.module.css';

export function FinalCtaBlock() {
  const { openMeetingWizard } = useConversion();

  return (
    <Section variant="dark">
      <Container size="md">
        <div className={classes.inner}>
          <h2 className={`ds-display ${classes.title}`}>
            Pronto para simplificar a gestão de pessoas?
          </h2>
          <p className={classes.subtitle}>
            Crie sua conta em minutos ou agende uma conversa com nossa equipe.
          </p>
          <div className={classes.actions}>
            <Button component="a" href={SITE.signupUrl} variant="primary" size="lg">
              Criar conta grátis
              <IconArrowRight size={18} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={classes.secondaryOnDark}
              onClick={() => openMeetingWizard({ source: window.location.pathname })}
            >
              Agendar conversa
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
