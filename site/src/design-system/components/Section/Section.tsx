import type { ReactNode, CSSProperties } from 'react';
import classes from './Section.module.css';

type SectionVariant = 'default' | 'muted' | 'accent' | 'dark';

interface SectionProps {
  children: ReactNode;
  id?: string;
  variant?: SectionVariant;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Section({
  children,
  id,
  variant = 'default',
  compact = false,
  className = '',
  style,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`${classes.section} ${classes[variant]} ${compact ? classes.compact : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </section>
  );
}
