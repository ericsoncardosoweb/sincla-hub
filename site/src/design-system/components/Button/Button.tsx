import type { ReactNode, AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import classes from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'outline';
type ButtonSize = 'md' | 'lg';

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

type AnchorButtonProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { component?: 'a' };

type NativeButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { component?: 'button' };

export type ButtonProps = AnchorButtonProps | NativeButtonProps;

export function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    component = 'button',
    ...rest
  } = props;

  const cls = `${classes.button} ${classes[variant]} ${classes[size]} ${fullWidth ? classes.fullWidth : ''} ${className}`.trim();

  if (component === 'a') {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={cls} {...anchorProps}>
        {children}
      </a>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" className={cls} {...buttonProps}>
      {children}
    </button>
  );
}
