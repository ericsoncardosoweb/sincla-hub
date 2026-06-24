import { IconCheck } from '@tabler/icons-react';
import classes from './TrustStrip.module.css';

interface TrustStripProps {
  items: readonly string[];
}

export function TrustStrip({ items }: TrustStripProps) {
  return (
    <ul className={classes.list}>
      {items.map((item) => (
        <li key={item} className={classes.item}>
          <span className={classes.icon} aria-hidden="true">
            <IconCheck size={16} stroke={2.5} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
