import type { ReactNode, CSSProperties } from 'react';
import classes from './Container.module.css';

type ContainerSize = 'sm' | 'md' | 'xl';

interface ContainerProps {
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
  style?: CSSProperties;
}

export function Container({ children, size = 'xl', className = '', style }: ContainerProps) {
  return (
    <div className={`${classes.container} ${classes[size]} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
