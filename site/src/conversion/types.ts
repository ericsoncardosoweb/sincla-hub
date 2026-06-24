import type { MeetingIntent, SchedulePreference, TeamSize } from '../content/meeting';

export interface MeetingContact {
  name: string;
  phone: string;
  email?: string;
  company: string;
}

export interface MeetingRequest {
  intent: MeetingIntent;
  contact: MeetingContact;
  teamSize: TeamSize;
  schedulePreference: SchedulePreference;
  slot?: { start: string; end: string };
  source: {
    page: string;
    referrer?: string;
  };
}

export interface MeetingConfirmation {
  id: string;
  message: string;
  whatsappUrl?: string;
}

export interface MeetingWizardOptions {
  intent?: MeetingIntent;
  source?: string;
}

export interface ConversionContextValue {
  openMeetingWizard: (options?: MeetingWizardOptions) => void;
  closeMeetingWizard: () => void;
  meetingOpen: boolean;
}
