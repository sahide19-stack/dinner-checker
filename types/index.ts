export type Member = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type DinnerSchedule = {
  id: number;
  member_id: string;
  date: string; // YYYY-MM-DD
  status: 'absent';
  updated_at: string;
  updated_by: string;
};

export type Settings = {
  id: number;
  morning_notify_time: string;
  line_group_id: string | null;
  notify_user_id: string | null;
};

// Map of date string to array of absent member IDs
export type AbsentMap = Record<string, string[]>;
