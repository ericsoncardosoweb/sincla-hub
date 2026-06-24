import { Link } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { productList } from '../../content/products';
import { Container, Section, SectionHeader, Card } from '../../design-system/components';
import classes from './EcosystemFlowBlock.module.css';

const FLOW = [
  {
    step: '1',
    title: 'Recrutamento aprova',
    description: 'Candidato selecionado entra no RH sem redigitar dados.',
    from: 'recrutamento',
    to: 'rh',
  },
  {
    step: '2',
    title: 'RH admite',
    description: 'Nova admissão matricula trilhas de integração no EAD.',
    from: 'rh',
    to: 'ead',
  },
  {
    step: '3',
    title: 'EAD certifica',
    description: 'Conclusões voltam ao histórico do colaborador no RH.',
    from: 'ead',
    to: 'rh',
  },
] as const;

export function EcosystemFlowBlock() {
  return (
    <Section variant="muted" id="ecossistema">
      <Container>
        <SectionHeader
          eyebrow="Ecossistema integrado"
          title="Menos planilha. Mais fluxo."
          subtitle="Os módulos Sincla conversam entre si — você não precisa conectar sistemas manualmente."
        />

        <div className={classes.grid}>
          {FLOW.map((item) => {
            const fromProduct = productList.find((p) => p.id === item.from)!;
            const toProduct = productList.find((p) => p.id === item.to)!;

            return (
              <Card key={item.step} padding="lg" className={classes.card}>
                <span className={classes.step}>{item.step}</span>
                <h3 className={`ds-heading ${classes.cardTitle}`}>{item.title}</h3>
                <p className={`ds-body ${classes.cardDesc}`}>{item.description}</p>
                <div className={classes.route}>
                  <Link to={fromProduct.path} className={classes.pill} style={{ '--pill-color': fromProduct.color } as React.CSSProperties}>
                    {fromProduct.shortName}
                  </Link>
                  <IconArrowRight size={16} className={classes.arrow} />
                  <Link to={toProduct.path} className={classes.pill} style={{ '--pill-color': toProduct.color } as React.CSSProperties}>
                    {toProduct.shortName}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
