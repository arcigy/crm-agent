import { SmartLeadCampaign, AddLeadsToCampaignPayload } from '@/types/smartlead';

const SMARTLEAD_API_URL = 'https://server.smartlead.ai/api/v1';

/**
 * Helper to make requests to SmartLead API
 */
async function smartLeadRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Support both singular and plural variable names to match user's .env
  const apiKey = process.env.SMARTLEAD_API_KEY || process.env.SMARTLEADS_API_KEY;

  if (!apiKey) {
    throw new Error('SMARTLEADS_API_KEY is not defined in environment variables');
  }

  const url = `${SMARTLEAD_API_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
  };

  // Append API key to URL
  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = `${url}${separator}api_key=${apiKey}`;

  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SmartLead API Error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

export const smartLead = {
  /**
   * Fetch all campaigns
   */
  async getCampaigns(): Promise<SmartLeadCampaign[]> {
    return smartLeadRequest<SmartLeadCampaign[]>('/campaigns');
  },

  /**
   * Fetch specific campaign details
   */
  async getCampaign(id: string | number): Promise<SmartLeadCampaign> {
    return smartLeadRequest<SmartLeadCampaign>(`/campaigns/${id}`);
  },

  /**
   * Add leads to a campaign
   */
  async addLeadsToCampaign(payload: AddLeadsToCampaignPayload): Promise<{ status: string; count: number }> {
    return smartLeadRequest<{ status: string; count: number }>(`/campaigns/${payload.campaign_id}/leads`, {
      method: "POST",
      body: JSON.stringify({
        lead_list: payload.leads,
      }),
    });
  }
};
