import { exec } from 'child_process';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Automatyčná záloha PostgreSQL databázy do Google Drive.
 */
export async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `crm-backup-${timestamp}.sql.gz`;
  const filepath = path.join(process.cwd(), 'tmp', filename);

  // Ensure tmp directory exists
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  console.log(`[Backup] Starting backup: ${filename}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  // 0. Archive old audit logs (keep last 90 days in active table)
  try {
    const { db } = await import('./db');
    console.log('[Backup] Archiving old audit logs...');
    await db.query(`
      INSERT INTO audit_logs_archive 
      SELECT * FROM audit_logs 
      WHERE timestamp < NOW() - INTERVAL '90 days'
      ON CONFLICT DO NOTHING;
    `);
    
    const deleted = await db.query(`
      DELETE FROM audit_logs 
      WHERE timestamp < NOW() - INTERVAL '90 days'
      RETURNING id;
    `);
    console.log(`[Backup] Archived ${deleted.rowCount} old audit logs.`);
  } catch (auditErr) {
    console.warn('[Backup] Audit log archival failed (skipping):', (auditErr as Error).message);
  }

  // 1. Create compressed pg_dump
  // We use pg_dump command which must be available in the environment (e.g., Railway Nixpacks)
  await new Promise((resolve, reject) => {
    // Note: On Windows, this might require pg_dump in PATH. 
    // In production (Linux), this is standard.
    exec(
      `pg_dump "${databaseUrl}" | gzip > "${filepath}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`[Backup] pg_dump error: ${stderr}`);
          return reject(error);
        }
        resolve(null);
      }
    );
  });

  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file was not created.');
  }

  const stats = fs.statSync(filepath);
  console.log(`[Backup] Backup created: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // 2. Upload to Google Drive backup folder
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  if (!serviceAccountJson || !folderId) {
    console.warn('[Backup] Missing Google Drive configuration. Backup saved locally only.');
    return { success: true, filename, size: stats.size, localOnly: true };
  }

  try {
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
        mimeType: 'application/gzip',
        body: fs.createReadStream(filepath)
      }
    });

    console.log(`[Backup] Backup uploaded to Google Drive: ${filename} (ID: ${response.data.id})`);

    // 3. Cleanup old backups (keep last 30 days)
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldFiles = await drive.files.list({
      q: `'${folderId}' in parents and name contains 'crm-backup-' and createdTime < '${cutoffDate.toISOString()}'`,
      fields: 'files(id, name, createdTime)'
    });

    for (const file of oldFiles.data.files || []) {
      await drive.files.delete({ fileId: file.id! });
      console.log(`[Backup] Deleted old backup: ${file.name}`);
    }

    // 4. Cleanup local temp file
    fs.unlinkSync(filepath);

    return { success: true, filename, size: stats.size, driveId: response.data.id };
  } catch (err) {
    console.error('[Backup] Google Drive upload failed:', err);
    return { success: false, error: (err as Error).message, localPath: filepath };
  }
}

// Run if called directly
if (require.main === module) {
  backupDatabase().catch(err => {
    console.error('Fatal backup error:', err);
    process.exit(1);
  });
}
