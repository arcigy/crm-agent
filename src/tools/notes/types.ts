export interface Note {
  id: string;
  title: string;
  content: string;
  date_created: string;
  user_email: string;
  contact_id?: number | null;
  project_id?: number | null;
  deal_id?: number | null;
  task_id?: number | null;
  file_link?: string | null;
}
