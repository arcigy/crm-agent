import { Project } from './project';

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

export interface Lead {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    phone?: string;
    company?: string;
    activities?: Activity[];
    deals?: Deal[];
    projects?: Project[];
    comments?: string;
    birthday?: string;
    nameday?: string;
}
