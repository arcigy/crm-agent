'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createCheckoutSession(priceId: string, toolId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get the origin for success/cancel URLs
  const headersList = await headers();
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        toolId: toolId,
      },
      success_url: `${origin}/dashboard?success=true&tool=${toolId}`,
      cancel_url: `${origin}/dashboard?canceled=true`,
      customer_email: user.email,
    });

    if (session.url) {
      redirect(session.url);
    }
  } catch (error) {
    // If it's a redirect error, let it pass
    if ((error as any).message === 'NEXT_REDIRECT') {
      throw error;
    }
    console.error('Stripe Checkout Error:', error);
    throw new Error('Failed to create checkout session');
  }
}
