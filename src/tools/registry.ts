import { LucideIcon, Zap, FolderKanban, Calendar, Mail } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  stripePriceId?: string;
  path: string;
}

export const tools: Tool[] = [
  {
    id: 'projects',
    name: 'Projekty',
    description: 'Správa klientskych projektov, sledovanie štádií a termínov.',
    icon: FolderKanban,
    stripePriceId: 'price_projects_premium',
    path: '/dashboard/projects',
  },
  {
    id: 'calendar',
    name: 'Kalendár',
    description: 'Plná synchronizácia s Google Kalendárom, správa úloh a stretnutí.',
    icon: Calendar,
    stripePriceId: 'price_calendar_premium',
    path: '/dashboard/calendar',
  },
  {
    id: 'leads',
    name: 'Leads Inbox',
    description: 'Synchronizácia s Gmailom a správa potenciálnych klientov (leads) z e-mailov.',
    icon: Mail,
    stripePriceId: 'price_leads_premium',
    path: '/dashboard/leads',
  },
  {
    id: 'booking',
    name: 'Booking System',
    description: 'Vlastný scheduler typu Cal.com pre automatizované plánovanie stretnutí.',
    icon: Zap, // Will change if needed
    stripePriceId: 'price_booking_premium',
    path: '/dashboard/booking',
  },
  {
    id: 'dummy-tool',
    name: 'Dummy Tool',
    description: 'A test tool to verify access control and payments.',
    icon: Zap,
    stripePriceId: 'price_dummy_123', // Placeholder
    path: '/dashboard/tool/dummy-tool',
  }
];
