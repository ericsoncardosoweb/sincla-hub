import classes from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  tone?: 'brand' | 'neutral' | 'launch';
}

export function Badge({ children, tone = 'brand' }: BadgeProps) {
  return <span className={`${classes.badge} ${classes[tone]}`}>{children}</span>;
}
