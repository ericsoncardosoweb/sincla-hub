import { Button } from '../Button/Button';
import classes from './DualCta.module.css';

interface CtaAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DualCtaProps {
  primary: CtaAction;
  secondary: CtaAction;
  microcopy?: string;
  stacked?: boolean;
}

export function DualCta({ primary, secondary, microcopy, stacked = false }: DualCtaProps) {
  return (
    <div className={classes.wrapper}>
      <div className={`${classes.actions} ${stacked ? classes.stacked : ''}`}>
        {primary.href ? (
          <Button component="a" href={primary.href} variant="primary" size="lg" fullWidth={stacked}>
            {primary.label}
          </Button>
        ) : (
          <Button variant="primary" size="lg" fullWidth={stacked} onClick={primary.onClick}>
            {primary.label}
          </Button>
        )}
        {secondary.href ? (
          <Button component="a" href={secondary.href} variant="outline" size="lg" fullWidth={stacked}>
            {secondary.label}
          </Button>
        ) : (
          <Button variant="outline" size="lg" fullWidth={stacked} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
      </div>
      {microcopy && <p className="ds-microcopy">{microcopy}</p>}
    </div>
  );
}
