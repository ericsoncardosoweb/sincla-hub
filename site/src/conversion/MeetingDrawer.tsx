import { useMediaQuery } from '@mantine/hooks';
import { Drawer, Modal } from '@mantine/core';
import { MeetingWizard } from './MeetingWizard';
import type { MeetingIntent } from '../content/meeting';
import classes from './MeetingDrawer.module.css';

interface MeetingDrawerProps {
  opened: boolean;
  onClose: () => void;
  initialIntent?: MeetingIntent;
  source: string;
}

export function MeetingDrawer({ opened, onClose, initialIntent, source }: MeetingDrawerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const content = (
    <MeetingWizard
      initialIntent={initialIntent}
      source={source}
      onClose={onClose}
      onComplete={onClose}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        size="92%"
        withCloseButton={false}
        padding={0}
        classNames={{ content: classes.drawerContent, body: classes.drawerBody }}
        transitionProps={{ transition: 'slide-up', duration: 280 }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={480}
      withCloseButton={false}
      padding={0}
      radius="lg"
      classNames={{ content: classes.modalContent, body: classes.modalBody }}
    >
      {content}
    </Modal>
  );
}
