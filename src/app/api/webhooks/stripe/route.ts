import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature');

  if (!signature) {
    return new NextResponse('Missing Stripe signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new NextResponse('Webhook error', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Extract metadata
    const userId = session.metadata?.userId;
    const toolId = session.metadata?.toolId;

    if (userId && toolId) {
      // Upsert into Supabase using Admin Client (updates if exists, creates if new)
      // Requires unique constraint on (user_id, tool_id)
      const { error } = await supabaseAdmin.from('user_tool_access').upsert({
        user_id: userId,
        tool_id: toolId,
        stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        status: 'active'
      }, {
        onConflict: 'user_id, tool_id'
      });

      if (error) {
        console.error('Error upserting into Supabase:', error);
        return new NextResponse('Database error', { status: 500 });
      }
    } else {
      console.warn('Missing userId or toolId in session metadata');
    }
  }

  return new NextResponse(null, { status: 200 });
}
