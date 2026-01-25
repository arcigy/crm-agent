import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
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
    const toolId = session.metadata?.toolId;

    if (toolId) {
      // TODO: Store tool access in Directus
      // For now, just log the successful payment
      console.log(`Payment completed for tool: ${toolId}, customer: ${session.customer_email}`);
    } else {
      console.warn('Missing toolId in session metadata');
    }
  }

  return new NextResponse(null, { status: 200 });
}
