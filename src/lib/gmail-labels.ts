import { db } from "./db";
import { getValidToken, getGmailClient } from "./google";

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  colorBg?: string;
  colorText?: string;
}

/**
 * Creates the gmail_label_names table if it doesn't exist
 */
export async function ensureLabelTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS gmail_label_names (
      user_email    VARCHAR(255) NOT NULL,
      label_id      VARCHAR(255) NOT NULL,
      label_name    VARCHAR(255) NOT NULL,
      label_type    VARCHAR(50),
      color_bg      VARCHAR(50),
      color_text    VARCHAR(50),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_email, label_id)
    );
  `);
}

/**
 * Fetches all labels from Gmail API and stores them in the local database
 */
export async function syncGmailLabels(userEmail: string, clerkUserId: string = ""): Promise<void> {
  console.log(`[Labels Sync] Syncing labels for ${userEmail}...`);
  
  try {
    const token = await getValidToken(clerkUserId, userEmail);
    if (!token) {
      console.warn(`[Labels Sync] No token for ${userEmail}, skipping.`);
      return;
    }

    const gmail = await getGmailClient(token);
    const response = await gmail.users.labels.list({ userId: 'me' });
    const labels = response.data.labels || [];

    await ensureLabelTable();

    for (const label of labels) {
      await db.query(`
        INSERT INTO gmail_label_names 
          (user_email, label_id, label_name, label_type, 
           color_bg, color_text, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_email, label_id)
        DO UPDATE SET
          label_name = EXCLUDED.label_name,
          label_type = EXCLUDED.label_type,
          color_bg = EXCLUDED.color_bg,
          color_text = EXCLUDED.color_text,
          updated_at = NOW()
      `, [
        userEmail.toLowerCase(),
        label.id,
        label.name,
        label.type,
        label.color?.backgroundColor || null,
        label.color?.textColor || null
      ]);
    }

    console.log(`[Labels Sync] Successfully synced ${labels.length} labels for ${userEmail}`);
  } catch (error) {
    console.error(`[Labels Sync] FAILED for ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Returns a label name mapping for a user
 */
export async function getLabelMap(userEmail: string): Promise<Record<string, GmailLabel>> {
  const res = await db.query(`
    SELECT label_id, label_name, label_type, color_bg, color_text
    FROM gmail_label_names
    WHERE user_email = $1
  `, [userEmail.toLowerCase()]);

  const map: Record<string, GmailLabel> = {};
  res.rows.forEach(row => {
    map[row.label_id] = {
      id: row.label_id,
      name: row.label_name,
      type: row.label_type,
      colorBg: row.color_bg,
      colorText: row.color_text
    };
  });
  return map;
}
