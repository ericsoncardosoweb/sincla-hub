import { Link } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { SITE, TRUST_ITEMS } from '../../content/site';
import { useConversion } from '../../conversion/ConversionProvider';
import {
  Badge,
  Container,
  DualCta,
  Section,
  TrustStrip,
} from '../../design-system/components';
import classes from './HeroBlock.module.css';

export function HeroBlock() {
  const { openMeetingWizard } = useConversion();

  return (
    <Section variant="default" className={classes.hero}>
      <div className={classes.gridBg} aria-hidden="true" />
      <Container>
        <div className={classes.layout}>
          <div className={classes.content}>
            <Badge tone="launch">{SITE.launchBadge}</Badge>
            <h1 className={`ds-display ${classes.title}`}>
              RH, vagas e treinamento
              <span className={classes.accent}> no mesmo lugar.</span>
            </h1>
            <p className={`ds-body ${classes.subtitle}`}>{SITE.description}</p>
            <DualCta
              stacked
              primary={{ label: 'Criar conta grátis', href: SITE.signupUrl }}
              secondary={{
                label: 'Agendar conversa de 20 min',
                onClick: () => openMeetingWizard({ source: '/' }),
              }}
              microcopy="Grátis · Sem cartão · Suporte em português"
            />
            <TrustStrip items={TRUST_ITEMS} />
          </div>

          <div className={classes.visual}>
            <div className={classes.visualCard}>
              <div className={classes.visualHeader}>
                <span className={classes.dotRed} />
                <span className={classes.dotYellow} />
                <span className={classes.dotGreen} />
                <span className={classes.visualTitle}>Sincla Hub</span>
              </div>
              <div className={classes.flow}>
                <Link to="/rh" className={classes.flowNode} style={{ '--node-color': '#0066CC' } as React.CSSProperties}>
                  <img src="/logos/sincla-rh.svg" alt="" />
                  <span>Sincla RH</span>
                </Link>
                <span className={classes.flowLine} />
                <Link to="/talento" className={classes.flowNode} style={{ '--node-color': '#7C3AED' } as React.CSSProperties}>
                  <img src="/logos/sincla-talento.svg" alt="" />
                  <span>Recrutamento</span>
                </Link>
                <span className={classes.flowLine} />
                <Link to="/ead" className={classes.flowNode} style={{ '--node-color': '#E85D04' } as React.CSSProperties}>
                  <img src="/logos/sincla-ead.svg" alt="" />
                  <span>Sincla EAD</span>
                </Link>
              </div>
              <p className={classes.visualCaption}>Um cadastro · três módulos · dados sincronizados</p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function HeroBlockCompactLink() {
  return (
    <Link to="/#produtos" className={classes.exploreLink}>
      Ver módulos
      <IconArrowRight size={16} />
    </Link>
  );
}
