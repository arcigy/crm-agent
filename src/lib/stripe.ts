import Stripe from 'stripe';

// Use a fallback key for build time if env var is missing
// The actual key is required for runtime, but this prevents build failure
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_build_placeholder';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});
