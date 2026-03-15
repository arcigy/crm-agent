import { backupDatabase } from '../../src/lib/backup';

/**
 * CLI Wrapper for database backup
 */
async function main() {
  try {
    const result = await backupDatabase();
    if (result.success) {
      const sizeMb = result.size ? (result.size / 1024 / 1024).toFixed(2) : '0';
      console.log(`Backup completed successfully: ${result.filename} (${sizeMb} MB)`);
      if (result.localOnly) {
        console.warn('NOTE: Backup is only stored locally in tmp/ folder.');
      } else {
        console.log(`Uploaded to Google Drive: ${result.driveId}`);
      }
    } else {
      console.error(`Backup failed: ${result.error}`);
      if (result.localPath) {
        console.log(`A local copy may exist at: ${result.localPath}`);
      }
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal backup error:', err);
    process.exit(1);
  }
}

main();
