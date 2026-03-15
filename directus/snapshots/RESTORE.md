# Ako obnoviť konfiguráciu Directus

Tento projekt využíva `directus schema snapshot` na zálohovanie celej konfigurácie (kolekcie, polia, relácie, roly, oprávnenia).

## Obnova zo súboru snapshotu:

Ak máte lokálny súbor (napr. v `directus/snapshots/`):

```bash
npx directus schema apply directus/snapshots/[názov-súboru].json
```

## Obnova po úplne novej inštalácii Directus:

1.  Nastavte premenné prostredia (`DIRECTUS_URL`, `DIRECTUS_TOKEN` atď.).
2.  Spustite bootstrap (ak ide o čistú DB):
    ```bash
    npx directus bootstrap
    ```
3.  Aplikujte najnovšiu schému:
    ```bash
    npx directus schema apply directus/snapshots/[najnovší-súbor].json
    ```
4.  Obnovte dáta databázy pomocou `scripts/backup/restore-database.ts`.
5.  Overte, či kolekcie v Directuse súhlasia so schémou.

---

**Poznámka:** Snapshots sa automaticky vytvárajú každý týždeň a ukladajú sa na Google Drive aj lokálne.
