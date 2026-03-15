import { createDirectus, rest, staticToken, schemaSnapshot } from '@directus/sdk';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Vytvorí snapshot schémy Directus (kolekcie, polia, relácie, roly).
 */
export async function snapshotDirectus() {
  const url = process.env.DIRECTUS_URL || 'https://directus-buk1-production.up.railway.app'; // Fallback to public
  const token = process.env.DIRECTUS_TOKEN;

  if (!token) {
    throw new Error('DIRECTUS_TOKEN is missing.');
  }

  const client = createDirectus(url)
    .with(staticToken(token))
    .with(rest());

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `directus-snapshot-${timestamp}.json`;
  const snapshotsDir = path.join(process.cwd(), 'directus', 'snapshots');

  if (!fs.existsSync(snapshotsDir)) {
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  const filepath = path.join(snapshotsDir, filename);

  console.log(`[Snapshot] Starting Directus schema snapshot: ${filename}`);

  try {
    // 1. Získať snapshot schémy
    const snapshot = await client.request(schemaSnapshot());
    
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
    console.log(`[Snapshot] Snapshot saved locally: ${filepath}`);

    // 2. Upload to Google Drive if configured
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

    if (serviceAccountJson && folderId) {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(serviceAccountJson),
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      const drive = google.drive({ version: 'v3', auth });

      const response = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [folderId]
        },
        media: {
          mimeType: 'application/json',
          body: fs.createReadStream(filepath)
        }
      });
      console.log(`[Snapshot] Snapshot uploaded to Google Drive: ${filename} (ID: ${response.data.id})`);
    }

    // 3. Keep only last 10 local snapshots
    const files = fs.readdirSync(snapshotsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > 10) {
      files.slice(10).forEach(f => {
        fs.unlinkSync(path.join(snapshotsDir, f));
        console.log(`[Snapshot] Deleted old local snapshot: ${f}`);
      });
    }

    return { success: true, filename, localPath: filepath };
  } catch (err: any) {
    console.error('[Snapshot] Failed to create Directus snapshot:', err);
    return { success: false, error: err.message };
  }
}
