import type { ReactNode, CSSProperties } from 'react';
import classes from './Card.module.css';

interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  interactive = false,
  padding = 'md',
  className = '',
  style,
  onClick,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`${classes.card} ${classes[padding]} ${interactive ? classes.interactive : ''} ${className}`.trim()}
      style={style}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
