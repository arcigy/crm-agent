// Project Types for CRM
export interface Project {
    id: number;
    date_created: string;
    project_type: string;
    contact_id: number | null;
    contact_name?: string; // Joined from contacts table
    stage: ProjectStage;
    end_date: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export type ProjectStage =
    | 'planning'
    | 'in_progress'
    | 'review'
    | 'completed'
    | 'on_hold'
    | 'cancelled';

export const PROJECT_STAGES: { value: ProjectStage; label: string; color: string }[] = [
    { value: 'planning', label: 'Plánovanie', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'in_progress', label: 'V procese', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'review', label: 'Kontrola', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'completed', label: 'Dokončené', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'on_hold', label: 'Pozastavené', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'cancelled', label: 'Zrušené', color: 'bg-red-100 text-red-700 border-red-200' },
];

export const PROJECT_TYPES = [
    'Web Development',
    'Mobile App',
    'E-commerce',
    'Marketing Campaign',
    'Branding',
    'Consultation',
    'Maintenance',
    'Custom Integration',
];
