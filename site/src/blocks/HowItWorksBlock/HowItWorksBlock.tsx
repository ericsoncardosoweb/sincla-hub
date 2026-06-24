import { HOW_IT_WORKS_STEPS } from '../../content/site';
import { Container, Section, SectionHeader } from '../../design-system/components';
import classes from './HowItWorksBlock.module.css';

export function HowItWorksBlock() {
  return (
    <Section variant="default" id="como-funciona">
      <Container>
        <SectionHeader
          eyebrow="Como funciona"
          title="Três passos. Sem retrabalho."
          subtitle="Preencha uma vez. Use em RH, Recrutamento ou EAD quando precisar."
        />
        <ol className={classes.steps}>
          {HOW_IT_WORKS_STEPS.map((step) => (
            <li key={step.number} className={classes.step}>
              <span className={classes.number}>{step.number}</span>
              <div>
                <h3 className={`ds-heading ${classes.title}`}>{step.title}</h3>
                <p className={`ds-body ${classes.desc}`}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
