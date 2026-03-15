import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import directus from '@/lib/directus';
import { updateItem, readItems } from '@directus/sdk';

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

  const session = event.data.object as any;
  const customerEmail = session.customer_email || session.metadata?.userEmail;

  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    if (customerEmail) {
       // Sync to Directus
         try {
          const contacts = await directus.request(
            readItems('contacts' as any, {
               filter: { email: { _eq: customerEmail.toLowerCase() } }
            })
          ) as any[];

          if (contacts.length > 0) {
             const subscription = event.type === 'customer.subscription.updated' 
               ? event.data.object as Stripe.Subscription 
               : null;

             for (const contact of contacts) {
               await directus.request(
                 updateItem('contacts' as any, contact.id, {
                   subscription_status: subscription ? subscription.status : 'active',
                   stripe_customer_id: session.customer,
                   updated_at: new Date().toISOString()
                 })
               );
             }
             console.log(`[Stripe Webhook] Updated ${contacts.length} records for ${customerEmail}`);
          }
       } catch (err) {
         console.error("[Stripe Webhook] Error updating Directus:", err);
       }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
     if (customerEmail) {
        try {
          const contacts = await directus.request(
            readItems('contacts' as any, {
               filter: { email: { _eq: customerEmail.toLowerCase() } },
               limit: 1
            })
          ) as any[];
          
          if (contacts.length > 0) {
             await directus.request(updateItem('contacts' as any, contacts[0].id, {
                subscription_status: 'canceled'
             }));
          }
        } catch (e) { console.error(e); }
     }
  }

  return new NextResponse(null, { status: 200 });
}
