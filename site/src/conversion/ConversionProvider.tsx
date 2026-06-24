import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MeetingDrawer } from './MeetingDrawer';
import type { ConversionContextValue, MeetingWizardOptions } from './types';
import type { MeetingIntent } from '../content/meeting';

const ConversionContext = createContext<ConversionContextValue | null>(null);

export function ConversionProvider({ children }: { children: ReactNode }) {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [initialIntent, setInitialIntent] = useState<MeetingIntent | undefined>();
  const [source, setSource] = useState<string>('');

  const openMeetingWizard = useCallback((options?: MeetingWizardOptions) => {
    setInitialIntent(options?.intent);
    setSource(options?.source || window.location.pathname);
    setMeetingOpen(true);
  }, []);

  const closeMeetingWizard = useCallback(() => {
    setMeetingOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      openMeetingWizard,
      closeMeetingWizard,
      meetingOpen,
    }),
    [openMeetingWizard, closeMeetingWizard, meetingOpen],
  );

  return (
    <ConversionContext.Provider value={value}>
      {children}
      <MeetingDrawer
        opened={meetingOpen}
        onClose={closeMeetingWizard}
        initialIntent={initialIntent}
        source={source}
      />
    </ConversionContext.Provider>
  );
}

export function useConversion() {
  const ctx = useContext(ConversionContext);
  if (!ctx) {
    throw new Error('useConversion must be used within ConversionProvider');
  }
  return ctx;
}
