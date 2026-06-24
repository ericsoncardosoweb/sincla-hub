import { IconArrowRight } from '@tabler/icons-react';
import type { ProductContent } from '../../content/products';
import { useConversion } from '../../conversion/ConversionProvider';
import { Badge, Container, DualCta, Section } from '../../design-system/components';
import classes from './ProductHeroBlock.module.css';

interface ProductHeroBlockProps {
  product: ProductContent;
}

export function ProductHeroBlock({ product }: ProductHeroBlockProps) {
  const { openMeetingWizard } = useConversion();

  return (
    <Section variant="default" className={classes.hero}>
      <Container>
        <div className={classes.layout}>
          <div className={classes.content}>
            <Badge tone="brand">{product.tagline}</Badge>
            <h1 className={`ds-display ${classes.title}`}>
              {product.headline}
              <span style={{ color: product.color }}> {product.subheadline}</span>
            </h1>
            <p className={`ds-body ${classes.description}`}>{product.description}</p>
            <DualCta
              stacked
              primary={{ label: 'Testar grátis', href: product.signupUrl }}
              secondary={{
                label: 'Agendar conversa',
                onClick: () =>
                  openMeetingWizard({ intent: product.meetingIntent, source: product.path }),
              }}
              microcopy="Sem cartão · Ativação em minutos"
            />
            <a href="#recursos" className={classes.resourcesLink}>
              Ver recursos incluídos
              <IconArrowRight size={16} />
            </a>
          </div>
          <div className={classes.visual}>
            <div className={classes.preview} style={{ '--accent': product.color } as React.CSSProperties}>
              <div className={classes.previewHeader}>
                <img src={product.logo} alt="" />
                <span>{product.name}</span>
              </div>
              <ul className={classes.previewList}>
                {product.features.slice(0, 5).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
