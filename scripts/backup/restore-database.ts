import { exec } from 'child_process';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string) => new Promise<string>(resolve => rl.question(query, resolve));

/**
 * Script pre obnovu databázy zo zálohy na Google Drive.
 * VAROVANIE: Toto je deštruktívna operácia.
 */
async function restoreDatabase() {
  const backupFilename = process.argv[2];

  if (!backupFilename) {
    console.error('Použitie: npx tsx scripts/backup/restore-database.ts [názov-súboru-na-gdrive]');
    console.log('Príklad: npx tsx scripts/backup/restore-database.ts crm-backup-2026-03-13T09-48-57Z.sql.gz');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  if (!databaseUrl || !serviceAccountJson || !folderId) {
    console.error('Chýbajúca konfigurácia (DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_JSON alebo GOOGLE_DRIVE_BACKUP_FOLDER_ID)');
    process.exit(1);
  }

  // Confirm DESTRUCTIVE action
  const confirm = await question(`⚠️ VAROVANIE: Chystáte sa obnoviť databázu zo súboru ${backupFilename}.\nTo PREPÍŠE všetky aktuálne dáta v ${databaseUrl.split('@')[1]}.\nNaozaj chcete pokračovať? (napíšte 'ANO/YES'): `);

  if (confirm.toUpperCase() !== 'ANO' && confirm.toUpperCase() !== 'YES') {
    console.log('Obnova zrušená.');
    process.exit(0);
  }

  const localPath = path.join(process.cwd(), 'tmp', backupFilename);
  const sqlPath = localPath.replace('.gz', '');

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountJson),
      scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file']
    });

    const drive = google.drive({ version: 'v3', auth });

    // 1. Nájsť súbor na Google Drive
    console.log(`[Restore] Vyhľadávam súbor ${backupFilename}...`);
    const searchRes = await drive.files.list({
      q: `name = '${backupFilename}' and '${folderId}' in parents`,
      fields: 'files(id, name)'
    });

    const file = searchRes.data.files?.[0];
    if (!file || !file.id) {
      throw new Error(`Súbor ${backupFilename} nebol nájdený v priečinku záloh.`);
    }

    // 2. Stiahnuť súbor
    console.log(`[Restore] Sťahujem ${backupFilename} (ID: ${file.id})...`);
    const res = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'stream' });
    
    const dest = fs.createWriteStream(localPath);
    await new Promise<void>((resolve, reject) => {
      res.data
        .on('error', reject)
        .pipe(dest)
        .on('error', reject)
        .on('finish', () => resolve());
    });

    console.log(`[Restore] Súbor stiahnutý do ${localPath}`);

    // 3. Rozbaliť a obnoviť
    console.log(`[Restore] Rozbaľujem a spúšťam psql...`);
    
    // Linux/macOS style pipe (Railway standard)
    // On Windows, you'd need gunzip and psql in PATH
    const restoreCmd = `gunzip -c "${localPath}" | psql "${databaseUrl}"`;
    
    await new Promise((resolve, reject) => {
      exec(restoreCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Restore] psql error: ${stderr}`);
          return reject(error);
        }
        console.log(stdout);
        resolve(null);
      });
    });

    console.log('✅ Obnova databázy prebehla úspešne.');

  } catch (err) {
    console.error('❌ Obnova zlyhala:', err);
  } finally {
    rl.close();
    // Cleanup local files
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    process.exit(0);
  }
}

restoreDatabase();
