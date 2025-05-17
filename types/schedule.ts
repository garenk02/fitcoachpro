export type Frequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

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
  status?: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  place?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleFormData {
  client_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  status: string;
  place: string;
  recurring: boolean;
  frequency?: Frequency;
  recurrence_end_date?: Date | null;
}
