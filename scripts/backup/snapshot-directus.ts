import { snapshotDirectus } from '../../src/lib/directus-backup';

/**
 * CLI Wrapper for Directus schema snapshot
 */
async function main() {
  try {
    const result = await snapshotDirectus();
    if (result.success) {
      console.log(`Snapshot completed: ${result.filename}`);
    } else {
      console.error(`Snapshot failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal snapshot error:', err);
    process.exit(1);
  }
}

main();
