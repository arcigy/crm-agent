"use server";

import { stripe } from "@/lib/stripe";
import directus from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { auth, currentUser } from "@clerk/nextjs/server";
import { BillingStatus } from "@/types/billing";

export async function getBillingInfo(): Promise<BillingStatus> {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return {
      isActive: false,
      status: 'free',
      planName: 'ArciGy Free',
      hasAccessToAll: false
    };
  }

  const email = user.emailAddresses[0].emailAddress.toLowerCase();

  try {
    const contacts = await directus.request(
      readItems('contacts' as any, {
        filter: { email: { _eq: email } },
        limit: 1
      })
    ) as any[];

    if (contacts.length === 0) {
      // Lazy create contact in CRM context
      await directus.request(
        createItem('contacts' as any, {
          email,
          first_name: user?.firstName || '',
          last_name: user?.lastName || '',
          status: 'active'
        })
      );

      return {
        isActive: false,
        status: 'free',
        planName: 'ArciGy Free',
        hasAccessToAll: false
      };
    }

    const contact = contacts[0];
    const status = contact.subscription_status || 'free';
    const isActive = status === 'active';

    return {
      isActive,
      status: status as any,
      planName: isActive ? 'ArciGy Pro Bundle' : 'ArciGy Free',
      hasAccessToAll: isActive,
      stripeCustomerId: contact.stripe_customer_id,
    };
  } catch (error) {
    console.error("[Billing Action] Failed to fetch info:", error);
    return {
      isActive: false,
      status: 'free',
      planName: 'ArciGy Free',
      hasAccessToAll: false
    };
  }
}

export async function createCheckoutSession(priceId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses[0].emailAddress;

  // Find or create customer in Stripe
  let customerId: string | undefined;
  
  const contacts = await directus.request(
    readItems('contacts' as any, {
      filter: { email: { _eq: email.toLowerCase() } },
      limit: 1
    })
  ) as any[];

  if (contacts.length > 0 && contacts[0].stripe_customer_id) {
    customerId = contacts[0].stripe_customer_id;
  } else {
    // Search in Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        metadata: { clerkId: user.id }
      });
      customerId = newCustomer.id;
    }
    
    // Update Directus if contact exists
    if (contacts.length > 0) {
       await directus.request(updateItem('contacts' as any, contacts[0].id, {
          stripe_customer_id: customerId
       }));
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing?canceled=true`,
    metadata: {
      userEmail: email.toLowerCase()
    }
  });

  return { url: session.url };
}

export async function createPortalSession() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const contacts = await directus.request(
    readItems('contacts' as any, {
      filter: { email: { _eq: user.emailAddresses[0].emailAddress.toLowerCase() } },
      limit: 1
    })
  ) as any[];

  const customerId = contacts[0]?.stripe_customer_id;
  if (!customerId) throw new Error("No Stripe customer found");

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`,
  });

  return { url: session.url };
}
