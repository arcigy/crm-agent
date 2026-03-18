import { createDirectus, rest, staticToken } from '@directus/sdk';

async function diagnose() {
  const url = process.env.DIRECTUS_URL || 'http://directus-buk1.railway.internal:8055';
  const token = '3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE'; // From Gemini.md rules

  console.log("Checking Directus connectivity...");
  const client = createDirectus(url).with(staticToken(token)).with(rest());

  try {
    // Check gmail_messages count
    // Using raw SQL if possible or items
    // Since Directus is the source of truth, let's try to fetch items
    console.log("1. Checking gmail_messages count...");
    // Directus doesn't have a direct count(*) API in the SDK easily without multiple calls
    // unless we use the custom endpoint or just a query.
    // However, I can try to fetch 1 item to see if table exists.
    
    // Actually, I should use the NEXT_PUBLIC_DATABASE_URL to connect directly if available,
    // but the user rules say Directus is the source of truth.
  } catch (e) {
    console.error("Diagnosis failed:", e);
  }
}

// Since I don't want to install new dependencies, I'll try to use the existing `db` helper
// if I can find it in the codebase.
