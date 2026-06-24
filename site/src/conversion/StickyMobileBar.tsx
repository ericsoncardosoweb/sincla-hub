import { useEffect, useState } from 'react';
import { IconCalendar } from '@tabler/icons-react';
import { SITE } from '../content/site';
import { Button } from '../design-system/components';
import { useConversion } from './ConversionProvider';
import classes from './StickyMobileBar.module.css';

export function StickyMobileBar() {
  const { openMeetingWizard, meetingOpen } = useConversion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible || meetingOpen) return null;

  return (
    <div className={classes.bar} role="region" aria-label="Ações rápidas">
      <Button component="a" href={SITE.signupUrl} variant="primary" size="md" className={classes.primaryBtn}>
        Criar conta grátis
      </Button>
      <Button
        variant="outline"
        size="md"
        className={classes.secondaryBtn}
        onClick={() => openMeetingWizard({ source: window.location.pathname })}
      >
        <IconCalendar size={18} />
        Reunião
      </Button>
    </div>
  );
}
