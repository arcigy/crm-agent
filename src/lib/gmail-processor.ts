import directus from "@/lib/directus";
import { readItems, createItem, updateItem } from "@directus/sdk";
import { classifyEmail } from "@/app/actions/ai";
import { db } from "@/lib/db";

/**
 * Shared Gmail Processing Logic
 */

export async function processNewEmail(
  messageId: string,
  userEmail: string,
  gmail: any
) {
  try {
    // 1. Check if already processed (dedup)
    const existing = await checkActivityExists(messageId);
    if (existing) {
      console.log(`[Gmail] Already processed: ${messageId}`);
      return;
    }

    // 2. Fetch full email content
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    // 3. Extract subject, body, sender
    const headers = message.data.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const body = extractEmailBody(message.data.payload);

    // Skip if sent by the user themselves
    if (from.toLowerCase().includes(userEmail.toLowerCase())) return;

    // 4. AI Classification
    console.log(`[Gmail] Classifying email: ${subject}`);
    const classification = await classifyEmail(body, userEmail, from, subject);

    if (!classification) {
      console.error(`[Gmail] AI Classification returned null for ${messageId}`);
      return;
    }

    // 5. Link contact
    let contactId = null;
    const fromEmailMatch = from.match(/<(.+?)>/)?.[1] || from;
    const contacts = await directus.request(
      readItems("contacts", {
        filter: {
          _and: [
            { email: { _eq: fromEmailMatch } },
            { user_email: { _eq: userEmail } }
          ]
        },
        limit: 1
      })
    ) as any[];
    if (contacts.length > 0) contactId = contacts[0].id;

    // 6. Save to activities
    await saveEmailActivity({
      messageId,
      userEmail,
      subject,
      from,
      body: body.substring(0, 2000),
      classification,
      contactId
    });

    // 7. Apply Gmail label based on AI classification
    await applyAILabelToGmail(messageId, classification, userEmail, gmail);

    console.log(`[Gmail] ✅ Processed: ${subject} → ${classification.intent}`);

  } catch (err) {
    console.error(`[Gmail] Error processing message ${messageId}:`, err);
  }
}

export async function checkActivityExists(messageId: string) {
  const res = await db.query(`
    SELECT id FROM activities
    WHERE metadata->>'gmail_message_id' = $1
    LIMIT 1
  `, [messageId]);
  return res.rows.length > 0;
}

export async function saveEmailActivity(data: any) {
  const { messageId, userEmail, subject, from, body, classification, contactId } = data;
  
  try {
    // Check if exists first to avoid duplicates
    const exists = await checkActivityExists(messageId);
    if (exists) return;

    await directus.request(createItem('activities' as any, {
      type: "ai_analysis",
      subject,
      content: body,
      contact_id: contactId,
      user_email: userEmail,
      activity_date: new Date().toISOString(),
      metadata: {
        gmail_message_id: messageId,
        classification,
        sender: from,
        automated: true
      }
    }));
  } catch (err) {
    console.error(`[Gmail] saveEmailActivity Error:`, err);
  }
}

export function extractEmailBody(payload: any): string {
  if (!payload) return "No content";
  
  let body = "";
  if (payload.parts) {
    // Try to find plain text first, then html
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    const selectedPart = textPart || htmlPart;
    
    if (selectedPart && selectedPart.body?.data) {
      body = Buffer.from(selectedPart.body.data, "base64").toString();
    } else {
      // Recursive check for nested parts (e.g. multipart/related)
      for (const part of payload.parts) {
        body = extractEmailBody(part);
        if (body && body !== "No content") break;
      }
    }
  } else if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString();
  }
  
  return body || "No content";
}

export async function applyAILabelToGmail(
  messageId: string,
  classification: any,
  userEmail: string,
  gmail: any
) {
  const intent = classification.intent;
  if (!intent || intent === "spam") return;

  try {
    // Search for matching CRM label
    const labels = await directus.request(
      readItems('contact_labels', {
        filter: { 
          _and: [
            { name: { _icontains: intent } },
            { user_email: { _eq: userEmail } }
          ]
        },
        fields: ['id', 'name', 'gmail_label_id']
      })
    ) as any[];

    if (labels.length > 0) {
      const label = labels[0];
      let gmailLabelId = label.gmail_label_id;

      if (!gmailLabelId) {
        // Try to sync/create it if missing
        const { syncLabelToGmail } = await import("@/app/actions/labels");
        gmailLabelId = await syncLabelToGmail(label.id);
      }

      if (gmailLabelId) {
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            addLabelIds: [gmailLabelId]
          }
        });
        console.log(`[Gmail] Applied label ${label.name} to ${messageId}`);
      }
    }
  } catch (err) {
    console.error(`[Gmail] applyAILabelToGmail failed for ${messageId}:`, err);
  }
}
