import type { ProductContent } from '../../content/products';
import { Card, Container, Section, SectionHeader } from '../../design-system/components';
import classes from './ProductFeaturesBlock.module.css';

interface ProductFeaturesBlockProps {
  product: ProductContent;
}

export function ProductFeaturesBlock({ product }: ProductFeaturesBlockProps) {
  return (
    <Section variant="muted" id="recursos">
      <Container>
        <SectionHeader
          eyebrow="Recursos"
          title="Feito para o dia a dia da operação"
          subtitle="Funcionalidades reais — sem promessas genéricas."
        />
        <div className={classes.grid}>
          {product.benefits.map((benefit) => (
            <Card key={benefit.title} padding="lg" className={classes.card}>
              <span className={classes.marker} style={{ background: product.color }} />
              <h3 className={`ds-heading ${classes.title}`}>{benefit.title}</h3>
              <p className={`ds-body ${classes.desc}`}>{benefit.description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
