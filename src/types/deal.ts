import { ProjectStage } from "./project";

export interface Deal {
  id: number;
  name: string;
  value: number;
  contact_id: number | null;
  project_id?: number | null;
  paid: boolean;
  invoice_date?: string | null;
  due_date?: string | null;
  description?: string | null;
  date_created: string;
  date_updated?: string | null;

  // Virtual fields for display
  contact_name?: string;
  project_stage?: ProjectStage;
}

export type DealStatus = "draft" | "invoiced" | "paid" | "overdue";
