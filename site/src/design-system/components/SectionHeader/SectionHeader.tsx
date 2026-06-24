import type { ReactNode } from 'react';
import classes from './SectionHeader.module.css';

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}: SectionHeaderProps) {
  return (
    <header className={`${classes.header} ${classes[align]} ${className}`.trim()}>
      {eyebrow && <p className="ds-eyebrow">{eyebrow}</p>}
      <h2 className={`ds-heading ${classes.title}`}>{title}</h2>
      {subtitle && <p className={`ds-body ${classes.subtitle}`}>{subtitle}</p>}
    </header>
  );
}
