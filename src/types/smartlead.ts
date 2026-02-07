export interface SmartLeadCampaign {
  id: number;
  name: string;
  status: string;
  created_at: string;
  track_open: boolean;
  track_link: boolean;
  scheduler_cron_value: any;
  min_time_btwn_emails: number;
  max_time_btwn_emails: number;
  max_leads_per_day: number;
  client_id?: number;
}

export interface SmartLeadLead {
  first_name?: string;
  last_name?: string;
  email: string;
  company_name?: string;
  website?: string;
  location?: string;
  custom_fields?: Record<string, string>;
}

export interface AddLeadsToCampaignPayload {
  campaign_id: number;
  leads: SmartLeadLead[];
}
