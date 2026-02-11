import { Project } from './project';
export type { Project };

export interface Activity {
    type: 'call' | 'email' | 'meeting' | 'sms';
    date: string;
    subject?: string;
    content?: string;
    duration?: string;
}

export interface Deal {
    name: string;
    value: number;
    paid?: boolean;
    invoiceDate?: string;
    description?: string;
}

export interface Label {
    id: string | number;
    name: string;
    color: string;
}

export interface ContactItem {
  id: string | number;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  comments?: string;
  birthday?: string;
  nameday?: string;
  job_title?: string;
  address?: string;
  website?: string;
  user_email?: string;
  date_created?: string;
  projects?: Project[];
  deals?: Deal[];
  activities?: Activity[];
  labels?: { contact_labels_id: Label }[]; // Directus M2M junction
}

// Keep Lead for backward compatibility if needed, using ContactItem
export type Lead = ContactItem;
