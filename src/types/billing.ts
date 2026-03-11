export interface BillingStatus {
  isActive: boolean;
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing' | 'free';
  planName: string;
  hasAccessToAll: boolean;
  stripeCustomerId?: string;
  nextBillingDate?: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  isPopular?: boolean;
}
