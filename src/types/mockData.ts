import { Project } from './project';
import { Lead } from './contact';

export const MOCK_PROJECTS: Project[] = [
    {
        id: 1,
        date_created: '2026-01-15T10:00:00Z',
        project_type: 'Web Development',
        contact_id: 1,
        contact_name: 'Ján Novák',
        stage: 'in_progress',
        end_date: '2026-02-28',
        deleted_at: null,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-20T14:30:00Z',
    },
    {
        id: 2,
        date_created: '2026-01-10T08:30:00Z',
        project_type: 'E-commerce',
        contact_id: 2,
        contact_name: 'Mária Kováčová',
        stage: 'planning',
        end_date: '2026-03-15',
        deleted_at: null,
        created_at: '2026-01-10T08:30:00Z',
        updated_at: '2026-01-10T08:30:00Z',
    },
    {
        id: 3,
        date_created: '2025-12-20T09:00:00Z',
        project_type: 'Mobile App',
        contact_id: 3,
        contact_name: 'Peter Horák',
        stage: 'completed',
        end_date: '2026-01-20',
        deleted_at: null,
        created_at: '2025-12-20T09:00:00Z',
        updated_at: '2026-01-18T16:00:00Z',
    },
    {
        id: 4,
        date_created: '2026-01-05T11:15:00Z',
        project_type: 'Marketing Campaign',
        contact_id: null,
        contact_name: null,
        stage: 'review',
        end_date: '2026-01-30',
        deleted_at: null,
        created_at: '2026-01-05T11:15:00Z',
        updated_at: '2026-01-22T10:00:00Z',
    },
    {
        id: 5,
        date_created: '2026-01-18T14:00:00Z',
        project_type: 'Branding',
        contact_id: 1,
        contact_name: 'Ján Novák',
        stage: 'on_hold',
        end_date: null,
        deleted_at: null,
        created_at: '2026-01-18T14:00:00Z',
        updated_at: '2026-01-18T14:00:00Z',
    },
];

export const MOCK_CONTACTS: Lead[] = [
    {
        id: 1,
        first_name: 'Ján',
        last_name: 'Novák',
        email: 'jan.novak@example.sk',
        status: 'published',
        phone: '+421900123456',
        company: 'WebDesign s.r.o.',
        comments: 'Dôležitý klient pre web development.',
        activities: [
            { type: 'call', date: '2026-01-20', subject: 'Úvodná konzultácia', content: 'Prebrali sme požiadavky na nový web.' },
            { type: 'email', date: '2026-01-18', subject: 'Cenová ponuka', content: 'Odoslaná ponuka na schválenie.' }
        ],
        deals: [{ name: 'Web Dev Deal', value: 2500, paid: true }]
    },
    {
        id: 2,
        first_name: 'Mária',
        last_name: 'Kováčová',
        email: 'maria@eshop.sk',
        status: 'published',
        phone: '+421900987654',
        company: 'E-shop Solutions',
        activities: [{ type: 'email', date: '2026-01-15', subject: 'Otázka k platbám' }],
        deals: [{ name: 'E-commerce Setup', value: 4500 }]
    },
    {
        id: 3,
        first_name: 'Peter',
        last_name: 'Horák',
        email: 'horak@appfactory.sk',
        status: 'published',
        phone: '+421911222333',
        company: 'AppFactory',
        deals: [{ name: 'Mobile App Project', value: 8000, paid: false }]
    },
    {
        id: 4,
        first_name: 'Eva',
        last_name: 'Szabová',
        email: 'eva@marketing.sk',
        status: 'draft',
        phone: '+421944555666',
        company: 'Marketing Pro'
    },
];
