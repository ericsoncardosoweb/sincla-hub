import { Link } from 'react-router-dom';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { productList } from '../../content/products';
import { SITE } from '../../content/site';
import { Button, Card, Container, Section, SectionHeader } from '../../design-system/components';
import classes from './ProductGridBlock.module.css';

export function ProductGridBlock() {
  return (
    <Section variant="default" id="produtos">
      <Container>
        <SectionHeader
          eyebrow="Módulos Sincla"
          title="Escolha por onde começar"
          subtitle="Ative um módulo hoje. Adicione os outros depois — sem refazer cadastro."
        />
        <div className={classes.grid}>
          {productList.map((product) => (
            <Card key={product.id} padding="lg" className={classes.card}>
              <div className={classes.cardTop}>
                <div className={classes.iconWrap} style={{ background: product.color }}>
                  <img src={product.logo} alt="" />
                </div>
                <div>
                  <h3 className={`ds-heading ${classes.name}`}>{product.name}</h3>
                  <p className={`ds-body ${classes.tagline}`}>{product.tagline}</p>
                </div>
              </div>
              <ul className={classes.features}>
                {product.features.slice(0, 4).map((feature) => (
                  <li key={feature}>
                    <IconCheck size={16} stroke={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className={classes.actions}>
                <Button component="a" href={product.signupUrl} variant="primary" size="md" fullWidth>
                  Testar grátis
                </Button>
                <Link to={product.path} className={classes.link}>
                  Ver detalhes
                  <IconArrowRight size={16} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
        <p className={`ds-microcopy ${classes.note}`}>
          Todos os módulos usam o mesmo cadastro em{' '}
          <a href={SITE.hubUrl} target="_blank" rel="noopener noreferrer">
            app.sincla.com.br
          </a>
        </p>
      </Container>
    </Section>
  );
}
