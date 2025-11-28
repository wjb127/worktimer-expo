export interface WorkSession {
  id: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  date: string;
  created_at: string;
}

export interface SessionInsert {
  start_time: string;
  end_time: string | null;
  duration: number;
  date: string;
}
