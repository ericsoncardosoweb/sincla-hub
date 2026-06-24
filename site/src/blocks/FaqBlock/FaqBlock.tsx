import { Accordion } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { HOME_FAQ } from '../../content/faq';
import { Container, Section, SectionHeader } from '../../design-system/components';
import classes from './FaqBlock.module.css';

type FaqItem = { question: string; answer: string };

interface FaqBlockProps {
  items?: readonly FaqItem[] | FaqItem[];
  title?: string;
  subtitle?: string;
}

export function FaqBlock({
  items = HOME_FAQ,
  title = 'Perguntas frequentes',
  subtitle = 'Respostas diretas para decidir com tranquilidade.',
}: FaqBlockProps) {
  return (
    <Section variant="default" id="suporte">
      <Container size="md">
        <SectionHeader title={title} subtitle={subtitle} />
        <Accordion
          variant="separated"
          chevron={<IconChevronDown size={18} />}
          classNames={{
            item: classes.item,
            control: classes.control,
            panel: classes.panel,
            label: classes.label,
            content: classes.content,
          }}
        >
          {items.map((faq, index) => (
            <Accordion.Item key={faq.question} value={`faq-${index}`}>
              <Accordion.Control>{faq.question}</Accordion.Control>
              <Accordion.Panel>{faq.answer}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>
    </Section>
  );
}
