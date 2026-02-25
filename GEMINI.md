🏗️ 1. ARCHITEKTÚRA: "The Black Box" Tool System
Každý nástroj (tool) musí byť úplne nezávislý.

Modulárnosť: Ak sa vymaže priečinok v /src/tools/[tool-id], zvyšok CRM musí fungovať.

Registry Pattern: Existuje jeden centrálny súbor src/tools/registry.ts, ktorý definuje zoznam všetkých toolov, ich metaúdaje, ikony a ID ceny v Stripe.

Shared Layout: Všetky tooly používajú spoločný ToolWrapper komponent, ktorý zabezpečuje responzivitu a kontrolu prístupu.

💾 2. DATABÁZA: "Directus Native" (No Supabase)
Držíme sa týchto pravidiel pre prácu s dátami v Directuse:

Soft Deletes: Žiadny riadok sa nikdy reálne nemaže. Každá tabuľka má stĺpec deleted_at (timestamp) alebo status 'archived'.

Relácie: Každý tool má svoju tabuľku v Directuse, všetky sú prepojené na centrálnu tabuľku contacts cez contact_id.

Audit Logs: Dôležité zmeny sa logujú buď cez Directus Revisions alebo do vlastnej tabuľky audit_logs.

💳 3. PLATBY: "Stripe-Only" Workflow
Nikdy neexperimentujeme s vlastnou platobnou logikou.

Stripe Checkout: Výhradne používame predpripravenú stránku od Stripe.

Webhook Source of Truth: Jediný spôsob, ako užívateľ získa prístup k toolu, je potvrdenie zo Stripe Webhooku (invoice.paid alebo checkout.session.completed).

Subscription Management: Používame Stripe Customer Portal. Nekódujeme vlastnú správu kariet ani faktúr.

Apple/Google Pay: Musia byť povolené cez automatic_payment_methods.

📱 4. FRONTEND: "Mobile-First PWA"
Nepotrebujeme App Store, ale potrebujeme, aby to na iPhone vyzeralo ako appka.

PWA Manifest: Musí existovať manifest.json s ikonami a display: standalone.

No-Mac Dev: Všetko UI musí fungovať v Safari na iOS bez adresného riadku.

Click-to-Call: Telefónne čísla v CRM musia byť vždy ako <a href="tel:...">.

🧩 5. VIBE CODE PROTOKOL: "Anti-Spaghetti"
AI (Cursor/Gemini) nesmie generovať dlhé súbory.

150 Line Limit: Ak má súbor viac ako 150 riadkov, AI ho MUSÍ rozdeliť.

Logic Isolation: - UI komponenty sú v /components.

Matematika a API volania sú v /hooks.

Typy sú v /types.

No Inline Styles: Používame výhradne Tailwind CSS.

Zákaz tvrdých kódov: API kľúče, Stripe ID a URL adresy sú VŽDY v .env.

🛡️ 6. MUST-HAVE CRM FUNKCIE (Core)
Každý nový "Tool" musí byť schopný interagovať s týmito jadrovými funkciami:

Centrálne kontakty: Jeden zdroj pravdy pre všetkých klientov.

Timeline: Každý tool môže zapísať záznam do histórie kontaktu.

Export: Každý tool musí mať funkciu na export dát do CSV (kvôli slobode užívateľa).

🤖 POKYNY PRE AI (Pri každom promte)
Predtým, než napíšeš riadok kódu, navrhni štruktúru priečinkov.

Pri Stripe integrácii vždy najprv vytvor Webhook handler, až potom frontend tlačidlo.

NIKDY neprepisuj existujúce súbory tak, že z nich vymažeš dôležitú logiku, aby si "ušetril miesto". Ak je súbor príliš dlhý, rozdeľ ho.

💻 7. RUNTIME PROSTREDIE
Vývojové prostredie používa Windows s PowerShell.

PowerShell Syntax (CRITICAL):
NEPOUŽÍVAŤ bash/curl syntax.
VŽDY používať `Invoke-RestMethod` alebo `Invoke-WebRequest`.

❌ ZLE (Bash):
`curl -X POST ...`
`export VAR=...`

✅ DOBRE (PowerShell):
`Invoke-RestMethod -Uri "https://url.com/api" -Method Post -Body ...`
`$env:VAR = ...`

🚀 8. RAILWAY & DIRECTUS KONFIGURÁCIA
Produkčná URL CRM: https://crm.arcigy.cloud
Directus Public URL: https://directus-buk1-production.up.railway.app
Directus Private URL: http://directus-buk1.railway.internal:8055
Directus Token: 3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE
Directus Admin: arcigyback@gmail.com / Automatizacie#2025

Private Networking: CRM sa pripája na Directus cez private network pre rýchlejšiu komunikáciu.

- Server-side (DIRECTUS_URL): http://directus-buk1.railway.internal:8055
- Client-side (NEXT_PUBLIC_DIRECTUS_URL): https://directus-buk1-production.up.railway.app

Kolekcie v Directuse:

- contacts (id, first_name, last_name, email, phone, company, status, comments, date_created, date_updated, deleted_at)
- projects (id, project_type, contact_id, contact_name, stage, end_date, value, paid, invoice_date, due_date, date_created, date_updated, deleted_at)
- deals (id, name, value, contact_id, paid, invoice_date, description, date_created, date_updated, deleted_at)
- activities (id, type, contact_id, subject, content, duration, activity_date, date_created)
- crm_users (id, email, password_hash, first_name, last_name, role, status, date_created, date_updated)
- google_tokens (id, user_id, access_token, refresh_token, expiry_date, date_created, date_updated, deleted_at)
- email_analysis (message_id, intent, priority, sentiment, service_category, estimated_budget, next_step, summary, date_created, date_updated)
- android_logs (id, type, direction, phone_number, body, duration, timestamp, extra_data, contact_id, deleted_at, date_created)
- ai_memories (id, user_email, fact, category, confidence, date_created, date_updated)
- crm_tasks (id, title, completed, user_email, due_date, date_created)
- crm_notes (id, title, content, user_email, date_created)

Dôležité: Pred každou prácou s Directus API overiť, či služba beží na Railway.

🚫 9. SUPABASE: NEPOUŽÍVAŤ
Supabase sa v tomto projekte NEPOUŽÍVA pre dáta.
Všetky kontakty, projekty, deals a iné CRM dáta sú výhradne v Directus.
Supabase kód treba postupne odstrániť a nahradiť Directus volaniami.

🚀 10. GITHUB & DEPLOYMENT
GitHub repo: https://github.com/arcigy/crm-agent

⚠️ AKTUÁLNY REŽIM: LOKÁLNE TESTOVANIE
- Testujeme VÝHRADNE lokálne (npm run dev).
- NEPUSHUJ na GitHub ani nedeployuj na Railway, pokiaľ to užívateľ výslovne nevyžiada (napr. napíše "push" alebo "deploy").
- Keď dostaneš pokyn na push, použiješ:

```powershell
git add .
git commit -m "popis zmeny"
git push origin main
```

Railway automaticky deployuje z main branch po pushu.

🤖 11. AGENT ARCHITECTURE (7-LAYER PIPELINE)
Systém beží na robustnej pipeline, ktorá zabezpečuje >97% spoľahlivosť:

1. Gatekeeper → Router (Identifikácia zámeru)
2. Checklist (Stavový zoznam úloh - zabraňuje predčasnému koncu)
3. Orchestrator (Category-First plánovanie - šetrí tokeny a zvyšuje presnosť)
4. Preparer (Validácia argumentov a healing chýbajúcich ID)
5. Executor (Izolované a paralelné vykonávanie toolov)
6. Self-Corrector (Automatický retry pri chybe toolu)
7. Manifest & Reflection (Audit výsledkov a finálna verifikácia)

Kľúčové kľúče v stave:

- namespaced IDs (napr. contact_google_id) riešia kolízie pri misiách s viacerými entitami.
- isParallelSafe: true umožnuje asynchrónny beh (napr. generovanie textu), false vynucuje sekvenciu pre zápis do DB.

### 🛠️ 12. AUTOMATICKÁ ÚDRŽBA PROSTREDIA
- **ALWAYS RESTART:** Po každej finálnej úprave kódu MUSÍŠ automaticky reštartovať lokálny vývojový server (`npm run dev`), aby mal užívateľ web vždy dostupný.
- Ak port 3000 koliduje, použi: `taskkill /F /IM node.exe /T; npm run dev`.
