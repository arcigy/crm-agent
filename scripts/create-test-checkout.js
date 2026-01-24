const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Environment Variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (key && value && !key.startsWith('#')) {
        process.env[key] = value;
      }
    }
  });
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing keys in .env.local: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 2. Initialize Clients
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
});
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getOrCreateTestUser() {
  const email = 'test-automation@example.com';
  console.log(`Getting/Creating test user: ${email}...`);

  // Try to create user
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: 'secure-test-password-123',
    email_confirm: true,
    user_metadata: { full_name: 'Test Automation User' }
  });

  if (createData.user) {
    console.log('Created new test user:', createData.user.id);
    return createData.user.id;
  }

  // If already exists, look it up
  if (createError) {
    console.log('User creation failed (likely exists), looking up existing users...');
    // listUsers defaults to page 1, limit 50. Should find it if recently created.
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("Error listing users:", listError);
        throw listError;
    }
    
    const found = listData.users.find(u => u.email === email);
    if (found) {
        console.log('Found existing test user:', found.id);
        return found.id;
    }
  }
  
  throw new Error('Could not get or create test user (check permissions or limits)');
}

async function createCheckout() {
  try {
    const userId = await getOrCreateTestUser();
    
    console.log('Creating test checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Tool Access',
            },
            unit_amount: 2000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        userId: userId, // REAL User ID from Supabase
        toolId: 'test-tool-id-001',
      },
    });

    console.log('\n--- SUCCESS ---');
    console.log('Checkout Session created!');
    console.log('URL:', session.url);
    console.log('\nNext Step: Open this URL and pay to verify the webhook integration.');
  } catch (error) {
    console.error('Error:', error);
  }
}

createCheckout();
