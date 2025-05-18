export interface WorkoutExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  rest?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  trainer_id: string;
  client_id?: string | null;
  title: string;
  exercises: WorkoutExercise[];
  created_at?: string;
  clients?: {
    name: string;
  };
  client_name?: string;
}

export interface WorkoutFormData {
  title: string;
  client_id?: string;
  exercises: WorkoutExercise[];
}

// Database exercise type
export interface ExerciseData {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
}
