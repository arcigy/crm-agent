import { LucideIcon, Zap, FolderKanban, Calendar, Mail, CheckSquare, FileText, HardDrive, Receipt, FileSignature, Landmark, MapPin } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  stripePriceId?: string;
  path: string;
  allowedEmails?: string[]; // Restricted to these users
}

export const tools: Tool[] = [
  {
    id: 'google-maps',
    name: 'Google Maps Scraper',
    description: 'Automatizované získavanie kontaktov z Google Maps pomocou rotácie API kľúčov.',
    icon: MapPin,
    path: '/dashboard/google-maps',
  },
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
    icon: Zap,
    stripePriceId: 'price_booking_premium',
    path: '/dashboard/booking',
  },
  {
    id: 'todo',
    name: 'To Do',
    description: 'Osobný task manažér pre každodenné úlohy.',
    icon: CheckSquare,
    stripePriceId: 'price_todo_premium',
    path: '/dashboard/todo',
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Rýchle poznámky a myšlienky na jednom mieste.',
    icon: FileText,
    stripePriceId: 'price_notes_premium',
    path: '/dashboard/notes',
  },
  {
    id: 'files',
    name: 'Moje Súbory',
    description: 'Správa všetkých firemných súborov cez Google Drive.',
    icon: HardDrive,
    stripePriceId: 'price_files_premium',
    path: '/dashboard/files',
  },
  {
    id: 'dummy-tool',
    name: 'Dummy Tool',
    description: 'A test tool to verify access control and payments.',
    icon: Zap,
    stripePriceId: 'price_dummy_123',
    path: '/dashboard/tool/dummy-tool',
  },
  {
    id: 'invoicing',
    name: 'Fakturácia',
    description: 'Vlastný fakturačný systém pre vašu firmu.',
    icon: Receipt,
    stripePriceId: 'price_invoicing_premium',
    path: '/dashboard/invoicing',
  },
  {
    id: 'quotes',
    name: 'Cenové Ponuky',
    description: 'Tvorba a správa custom cenových ponúk.',
    icon: Landmark,
    stripePriceId: 'price_quotes_premium',
    path: '/dashboard/quotes',
  },
  {
    id: 'contracts',
    name: 'Zmluvy',
    description: 'Generovanie a správa klientskych zmlúv.',
    icon: FileSignature,
    stripePriceId: 'price_contracts_premium',
    path: '/dashboard/contracts',
  },
  {
    id: 'outreach',
    name: 'Cold Outreach',
    description: 'Automatizovaný cold outreach s AI analýzou odpovedí.',
    icon: Zap,
    path: '/dashboard/outreach',
    allowedEmails: ['branislav@arcigy.group', 'arcigyback@gmail.com'],
  }
];
