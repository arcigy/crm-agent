# 🚑 CRM Disaster Recovery Runbook

Tento dokument definuje procesy pre obnovu systému v prípade zlyhania infraštruktúry alebo straty dát.

## Ciele obnovy (SLAs)
- **RTO (Recovery Time Objective):** Cieľ < 2 hodiny (Doba od zlyhania po obnovu)
- **RPO (Recovery Point Objective):** Cieľ < 24 hodín (Maximálna strata dát - denná záloha)

---

## 🏗️ Scenáre obnovy

### Scenár 1: Náhodné vymazanie dát používateľom
1.  **Identifikujte zmeny:** Pozrite si `audit_logs` v CRM dashboarde pre zistenie `old_values`.
2.  **Manuálna oprava:** Ak ide o malé množstvo dát, opravte ich ručne v Directuse.
3.  **Obnova z DB:** Ak ide o hromadnú chybu, použite najnovšiu zálohu z Google Drive.

### Scenár 2: Korupcia PostgreSQL databázy na Railway
1.  **Zastavte služby:** Vypnite Directus a Cron services na Railway.
2.  **Stiahnite zálohu:** Získajte najnovší súbor `.sql.gz` z Google Drive ("CRM Backup" priečinok).
3.  **Spustite obnovu:**
    ```bash
    npx tsx scripts/backup/restore-database.ts [názov-súboru].sql.gz
    ```
4.  **Verifikácia:** Skontrolujte počty riadkov v kľúčových tabuľkách.
5.  **Reštart:** Zapnite služby na Railway.

### Scenár 3: Zmena konfigurácie Directus (Chybné polia/roly)
1.  **Zistite stav:** Ak bol poškodený dátový model, použite snapshot schémy.
2.  **Aplikujte snapshot:**
    ```bash
    npx directus schema apply directus/snapshots/[najnovší].json
    ```
3.  Postupujte podľa detailného návodu v `directus/snapshots/RESTORE.md`.

### Scenár 4: Totálne zlyhanie Railway (Migrácia na novú inštanciu)
1.  **Nová inštancia:** Vytvorte nový Railway projekt s PostgreSQL a Directusom.
2.  **Env premenné:** Nakopírujte `.env` z pôvodného projektu.
3.  **Migrácie:** Spustite `psql $NEW_DATABASE_URL -f scripts/migrations/001_concurrency_constraints.sql`.
4.  **Dáta:** Spustite `restore-database.ts`.
5.  **Schéma:** Spustite `directus schema apply`.
6.  **DNS:** Presmerujte doménu `crm.arcigy.cloud` na nový endpoint.

---

## 🔑 Prístupové údaje
- **Railway Dashboard:** [https://railway.app/project/...]
- **Google Drive Backups:** Priečinok s ID `${process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID}`
- **Service Account E-mail:** `crm-backup-service@calendar-485216.iam.gserviceaccount.com`

---

**Posledná kontrola:** 15. marec 2026
**Zodpovedná osoba:** Admin / ArciGy Team
