import type { ProductContent } from '../../content/products';
import { Card, Container, Section, SectionHeader } from '../../design-system/components';
import classes from './ProductIntegrationBlock.module.css';

interface ProductIntegrationBlockProps {
  product: ProductContent;
}

export function ProductIntegrationBlock({ product }: ProductIntegrationBlockProps) {
  return (
    <Section variant="default">
      <Container size="md">
        <SectionHeader title={product.integrationTitle} subtitle={product.integrationDesc} />
        <div className={classes.grid}>
          {product.integrationPoints.map((point) => (
            <Card key={point.title} padding="lg" className={classes.card}>
              <h3 className={`ds-heading ${classes.title}`}>{point.title}</h3>
              <p className={`ds-body ${classes.desc}`}>{point.description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
