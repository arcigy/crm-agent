import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import directus from "@/lib/directus";
import { readItems, updateItem } from "@directus/sdk";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.emailAddresses[0].emailAddress.toLowerCase();

  try {
    // 1. Get contact from Directus
    const contacts = await directus.request(
      readItems('contacts' as any, {
        filter: { email: { _eq: email } },
        limit: 1
      })
    ) as any[];

    if (contacts.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contact = contacts[0];
    const customerId = contact.stripe_customer_id;

    if (!customerId) {
      // If no customer ID, it might be a free plan or not yet linked
      return NextResponse.json({ status: 'free', message: "No Stripe customer linked" });
    }

    // 2. Fetch latest subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
       // Update to free if no subscriptions found
       await directus.request(updateItem('contacts' as any, contact.id, {
         subscription_status: 'free'
       }));
       return NextResponse.json({ status: 'free', message: "No active subscriptions found" });
    }

    const sub = subscriptions.data[0];
    const newStatus = sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'inactive';

    // 3. Update Directus
    await directus.request(updateItem('contacts' as any, contact.id, {
      subscription_status: newStatus,
      date_updated: new Date().toISOString()
    }));

    return NextResponse.json({ 
      success: true, 
      status: newStatus,
      stripeStatus: sub.status
    });

  } catch (error: any) {
    console.error("[Billing Sync API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
