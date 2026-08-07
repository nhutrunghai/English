export type StreakTaskStatus = 'todo' | 'doing' | 'done';

export interface StreakTask {
  id: string;
  studyDate: string;
  timeSlot: string;
  subject: string;
  durationHours: number;
  status: StreakTaskStatus;
  notes: string;
}

export interface StreakDayNote {
  studyDate: string;
  weekday: string;
  totalHours: string;
  notes: string;
}

