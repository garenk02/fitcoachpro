export interface ProgressEntry {
  id: string;
  client_id: string;
  trainer_id: string;
  date: string;
  weight?: number | null;
  body_fat?: number | null;
  muscle_mass?: number | null;
  water_content?: number | null;
  bone_density?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface ProgressFormValues {
  date: Date;
  weight?: number | null;
  body_fat?: number | null;
  notes?: string | null;
}
