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
Produkčná URL CRM: https://crm-agent-production-d1eb.up.railway.app
Directus URL: https://directus-production-58c1.up.railway.app
Directus Token: fZWEmYZ14ysG16WTfTIFTOBtuxFCumm6
Directus Admin: arcigyback@gmail.com / Automatizacie#2025

Kolekcie v Directuse:
- contacts (id, first_name, last_name, email, phone, company, status, comments, date_created, date_updated, deleted_at)
- projects (id, project_type, contact_id, contact_name, stage, end_date, date_created, date_updated, deleted_at)
- deals (id, name, value, contact_id, paid, invoice_date, description, date_created, date_updated, deleted_at)
- activities (id, type, contact_id, subject, content, duration, activity_date, date_created)
- crm_users (id, email, password_hash, first_name, last_name, role, status, date_created, date_updated)

Dôležité: Pred každou prácou s Directus API overiť, či služba beží na Railway.


🚫 9. SUPABASE: NEPOUŽÍVAŤ
Supabase sa v tomto projekte NEPOUŽÍVA pre dáta.
Všetky kontakty, projekty, deals a iné CRM dáta sú výhradne v Directus.
Supabase kód treba postupne odstrániť a nahradiť Directus volaniami.

🚀 10. GITHUB & DEPLOYMENT
GitHub repo: https://github.com/arcigy/crm-agent
Po KAŽDEJ zmene v kóde MUSÍŠ pushnúť na GitHub:
```powershell
git add .
git commit -m "popis zmeny"
git push origin main
```
Railway automaticky deployuje z main branch.
NIKDY netestuj len lokálne - vždy deploy na produkciu!