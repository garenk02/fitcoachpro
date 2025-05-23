export type Frequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type ScheduleStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';
export type ParticipantStatus = 'confirmed' | 'attended' | 'cancelled' | 'no-show';

export interface Schedule {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  client_id?: string;
  trainer_id?: string;
  frequency: Frequency;
  recurrence_end_date?: string | null;
  max_participants?: number;
  location?: string;
  status?: ScheduleStatus;
  place?: string;
  created_at?: string;
  updated_at?: string;
  is_group_session?: boolean;
}

export interface ScheduleParticipant {
  id: string;
  schedule_id: string;
  client_id: string;
  trainer_id: string;
  status: ParticipantStatus;
  created_at?: string;
  client?: {
    name: string;
  };
}

export interface ScheduleFormData {
  client_id?: string;
  participant_ids?: string[];
  date: Date;
  start_time: string;
  end_time: string;
  status: string;
  place: string;
  recurring: boolean;
  frequency?: Frequency;
  recurrence_end_date?: Date | null;
  is_group_session?: boolean;
  max_participants?: number;
}
