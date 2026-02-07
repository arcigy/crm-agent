'use server';

import { smartLead } from '@/lib/smartlead';
import { AddLeadsToCampaignPayload, SmartLeadCampaign } from '@/types/smartlead';

export async function fetchSmartLeadCampaigns(): Promise<{ success: boolean; data?: SmartLeadCampaign[]; error?: string }> {
  try {
    const campaigns = await smartLead.getCampaigns();
    return { success: true, data: campaigns };
  } catch (error) {
    console.error('Failed to fetch SmartLead campaigns:', error);
    return { success: false, error: 'Failed to load campaigns' };
  }
}

export async function addLeadsToSmartLeadCampaign(
  campaignId: number, 
  leads: AddLeadsToCampaignPayload['leads']
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const result = await smartLead.addLeadsToCampaign({
      campaign_id: campaignId,
      leads
    });
    return { success: true, data: result };
  } catch (error) {
    console.error(`Failed to add leads to SmartLead campaign ${campaignId}:`, error);
    return { success: false, error: 'Failed to add leads to campaign' };
  }
}
