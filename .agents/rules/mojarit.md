---
trigger: always_on
---

🤖 ARCIGY CRM — AI AGENT MASTER RULES

⚠️ CRITICAL WARNING FOR AI AGENTS
Tieto pravidlá sú absolútne záväzné a neoddeliteľné od stability tohto produkčného systému.
Akýkoľvek odklon či "rýchly hack" môže viesť k nenamennému porušeniu dátových relácií a finančných transakcií.
Prvý krok pri každom zásahu: Validácia registry.ts + Soft Deletes + Dizajn (Violet)


🏗️ ARCHITEKTÚRA: "The Black Box" Tool System
Princíp nezávislosti
Každý nástroj (tool) je samostatný, izolovaný modul. Výpadok alebo chyba v jednom module (src/tools/[tool-id]) nesmie narušiť zvyšok CRM.
src/
├── tools/
│   ├── registry.ts          ← CENTRÁLNA KONTROLA (všetky nástoje sa registrujú tu)
│   ├── [tool-id]/
│   │   ├── index.ts         ← Vstupný bod (max 150 riadkov)
│   │   ├── actions.ts       ← Logika & API volania
│   │   └── types.ts         ← TypeScript typy
│   └── ...
Registry Pattern (POVINNÉ)
Nástroj neexistuje v systéme, kým nie je registrovaný v src/tools/registry.ts.
typescript// src/tools/registry.ts — príklad

export const TOOL_REGISTRY = {
  contact_analyzer: {
    id: "contact_analyzer",
    name: "Contact Analyzer",
    enabled: true,  // ← Vypínaním se zabraňuje výpadky
    handler: contactAnalyzerHandler,
  },
  payment_webhook: {
    id: "payment_webhook",
    name: "Payment Webhook",
    enabled: false, // ← Vypnutý nástroj — žiadne mazanie z DB
    handler: null,
  },
};
Vypnutie nástrojov: Nástroj sa vypína v Registry (enabled: false), reálne sa nikdy nevymazávajú prepojené databázové riadky.

💾 DATABÁZA: "Directus Native" (Žiadny Supabase)
Zákaz Mazania — Soft Deletes Only
Žiadny záznam sa nikdy reálne nemaže pomocou .deleteOne() či DELETE. Každá tabuľka MUSÍ mať jeden z týchto stĺpcov:
PrístupStĺpecTypPríkladTimestampdeleted_attimestamp NULL2025-02-25T10:30:00ZBooleanis_deletedbooleantrue / falseStatusstatusenum'active', 'archived', 'trash'
Dotazovanie:
typescript// ✅ SPRÁVNE — Filtrujeme archived záznamy
const contacts = await directus.request(
  readItems('contacts', {
    filter: { is_deleted: { _eq: false } },
  })
);

// ❌ CHYBNE — Vymazávame v DB
await directus.request(deleteItem('contacts', contactId));
Zákaz Supabase — Výhradne Directus
Pre všetky dáta sa používa výhradne Directus (PostgreSQL backend). Supabase sa v tomto projekte nepoužíva.
typescript// ✅ SPRÁVNE
import { createClient } from '@directus/sdk';
const directus = createClient('https://your-directus-instance.com', { token });

// ❌ CHYBNE — Žiadne Supabase
const { data } = await supabase
  .from('contacts')
  .select('*');
Migrácia: Všetok existujúci kód so Supabase treba nahradiť za Directus volania.
Relácie — Unified Contacts Hub
Centrálna tabuľka contacts je hub pre všetky dáta z ostatných nástrojov.
contacts (PK: id)
├── contact_id (PK)
├── email
├── name
├── phone
├── tags
└── metadata {}

payment_records (FK: contact_id → contacts.id)
├── contact_id
├── stripe_customer_id
├── last_payment_date

email_history (FK: contact_id → contacts.id)
├── contact_id
├── sent_at
├── template_id

tasks (FK: contact_id → contacts.id)
├── contact_id
├── assigned_to
├── status
Povinné: Každý tool musí mapovať svoje dáta na contact_id bez výnimky.

🎨 DIZAJNOVÝ JAZYK: "Violet Branding"
Farbovú Schéma — VÝHRADNE Violet
Všetky komponenty, tlačidlá a vizuálne prvky musia používať Violet/Fialovoú schému.
KomponentFarbaTailwindHexPrimary CTAVioletbg-violet-500#a78bfaSecondary CTAVioletbg-violet-600#9333eaHoverViolethover:bg-violet-700#7e22ceBorderVioletborder-violet-900/30rgba(76, 29, 149, 0.3)TextViolettext-violet-400#c4b5fd
tsx// ✅ SPRÁVNE — Violet design
export function CRMButton() {
  return (
    <button className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl">
      Akcia
    </button>
  );
}

// ❌ CHYBNE — Iná farba
<button className="bg-blue-500">...</button>
Glassmorphism — Polotransparentná Elegancia
Komponenty používajú polotransparentné pozadia, jemné rohy a jemné okraje.
tsx// ✅ SPRÁVNE — Glassmorphism
<div className="bg-slate-900 bg-opacity-50 backdrop-blur-lg rounded-xl border border-violet-900/30">
  {/* obsah */}
</div>

// ❌ CHYBNE — Tuhý dizajn bez efektov
<div className="bg-white rounded-md">
  {/* obsah */}
</div>
Knižnice — Len Lucide + Tailwind

Ikony: VÝHRADNE lucide-react
Styling: VÝHRADNE Tailwind CSS (žiadne style={{}} inline)

tsx// ✅ SPRÁVNE
import { ArrowRight, AlertCircle } from 'lucide-react';

<ArrowRight className="w-5 h-5 text-violet-400" />

// ❌ CHYBNE
<img src="/icons/arrow.png" />
<div style={{ color: '#a78bfa' }}>...</div>

🧩 VIBE CODE PROTOKOL: "Anti-Spaghetti"
Limit Veľkosti — 150 Riadkov Maximum
Žiadny súbor nesmie presiahnuť 150 logických riadkov. Ak si na ceste k 150, musíš sa začať uvažovať o delení.
✅ Akceptovať:
- `components/ContactCard.tsx` — 145 riadkov
- `actions/validateEmail.ts` — 80 riadkov

❌ Sporne:
- `tools/contact_analyzer/index.ts` — 287 riadkov (ROZDELIŤ!)
Separácia Logiky — Priestorov
src/
├── components/              ← UI komponenty (JSX)
│   ├── ContactCard.tsx
│   ├── DashboardHeader.tsx
│   └── ...
├── hooks/                   ← Logika, API volania, state management
│   ├── useContactData.ts
│   ├── useStripeWebhook.ts
│   └── ...
├── actions/                 ← Server-side logika
│   ├── sendEmail.ts
│   ├── syncPaymentStatus.ts
│   └── ...
├── types/                   ← TypeScript definície
│   ├── contact.types.ts
│   ├── payment.types.ts
│   └── ...
└── tools/                   ← Agent tools (registry + moduly)
    ├── registry.ts
    └── [tool-id]/
Príklad rozdelenia:
typescript// ❌ CHYBNE — Všetko v jednom súbore
// src/tools/contact_analyzer/index.ts (400 riadkov)
function fetchContact() { /* ... */ }
function analyzeData() { /* ... */ }
function renderUI() { /* ... */ }
export function handler() { /* vše dohromady */ }

// ✅ SPRÁVNE — Rozdelené
// src/tools/contact_analyzer/index.ts (60 riadkov — vstupný bod)
import { fetchAndAnalyze } from './actions';
import { AnalysisUI } from './components';
export async function handler(input) {
  const data = await fetchAndAnalyze(input);
  return AnalysisUI(data);
}

// src/tools/contact_analyzer/actions.ts (85 riadkov — logika)
export async function fetchAndAnalyze(contactId) { /* ... */ }

// src/tools/contact_analyzer/components.tsx (70 riadkov — UI)
export function AnalysisUI(data) { /* ... */ }
Žiadne Hardcoded Dáta
Všetky kľúče, URL, ID a tajomstvá musia ísť do .env.local:
bash# ✅ SPRÁVNE — .env.local
DIRECTUS_URL=https://your-instance.directus.app
DIRECTUS_TOKEN=abc123xyz...
STRIPE_WEBHOOK_SECRET=whsec_test123...
CONTACT_TABLE_ID=contacts
PAYMENT_WEBHOOK_URL=https://yourdomain.com/webhooks/stripe

# ❌ CHYBNE — Hardcoded v kóde
const DIRECTUS_URL = 'https://production-instance.directus.app';
const STRIPE_KEY = 'sk_live_...';

💳 PLATBY: "Stripe-Only"
Zákaz Custom Platobnej Logiky
Všetko, čo sa týka faktúr a platieb (invoices, subscriptions, refunds), sa rieší výhradne v Stripe a jeho Customer Portal.
typescript// ✅ SPRÁVNE — Poukazujeme na Stripe Portal
function openCustomerPortal(customerId) {
  const portalUrl = `https://billing.stripe.com/p/customer/${customerId}`;
  window.location.href = portalUrl;
}

// ❌ CHYBNE — Custom logika pre faktúry
function createInvoice(data) {
  // Ručné vytvorenie faktúry bez Stripe
  db.insert('invoices', data);
}
Source of Truth = Webhook
Prístup do premium features sa NEUDELEĽUJE kliknutím na "Upgrade" tlačidlo.
Prístup sa odomyká výhradne cez Stripe Webhook na základe subscription.status:
typescript// Webhook handler — päť sekúnd potom, čo sa zmení subscription
async function handleStripeWebhook(event) {
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    
    if (subscription.status === 'active') {
      // ✅ Odomknúť premium
      await directus.request(
        updateItem('contacts', subscription.metadata.contact_id, {
          subscription_status: 'active',
          updated_at: new Date(),
        })
      );
    }
  }
}

🤖 AGENT & AI WORKFLOW
Zachovávanie Kontextu — ID Reťazce
IDčká (contact_id, tool_id, session_id) sa musia odovzdávať po celý čas behu nástrojov bez potreby ich opakovaného hľadania.
typescript// ✅ SPRÁVNE — ID sa prenáša cez call stack
async function agentWorkflow(initialContactId) {
  const contactData = await fetchContact(initialContactId);
  const analysis = await analyzeContact(initialContactId, contactData);
  const email = await draftEmail(initialContactId, analysis);
  return email;
}

// ❌ CHYBNE — Opakované hľadanie
async function analyzeContact(contactName) {
  // Znovu hľadáme po mene (neefektívne, chybové)
  const contact = await directus.request(
    readItems('contacts', { filter: { name: { _eq: contactName } } })
  );
}
Self-Healing — Automatická Náprava
Ak nástroj zlyhá, systém musí vykonať automatickú nápravnú akciu pred eskaláciou k užívateľovi.
typescript// ✅ SPRÁVNE — Self-healing
async function sendEmail(contactId, template) {
  try {
    return await emailService.send(contactId, template);
  } catch (error) {
    // Náprava 1: Skúsi alternatívny email
    const altEmail = await getBackupEmail(contactId);
    try {
      return await emailService.send(altEmail, template);
    } catch (finalError) {
      // Náprava 2: Zloguj, no neprekážaj používateľovi
      logger.error({ contactId, error: finalError });
      return { success: false, reason: 'email_retry_failed' };
    }
  }
}

// ❌ CHYBNE — Stack trace do UI
try {
  await sendEmail(contactId, template);
} catch (error) {
  showError(error.stack); // ← Únik technických detailov
}
Komunikácia — Slovenčina Všade
Agent vždy komunikuje, loguje a sumarizuje v priateľskej slovenčine. Technické stack traces sa nikdy nezobrazia užívateľovi.
typescript// ✅ SPRÁVNE — Užívateľský jazyk
console.log(`✓ Kontakt ${contactName} bol analyzovaný.`);
showNotification('Email bol úspešne odoslaný Jánovi.');
logger.info(`Platba pre ${contactId} bola synchronizovaná.`);

// ❌ CHYBNE — Stack traces v UI
showError('TypeError: Cannot read property "email" of undefined at line 42');
console.log('FATAL: directus.request() returned 500 Internal Server Error');

💻 DEV & DEPLOYMENT PROSTREDIE
Windows / PowerShell — Skriptovanie
Ak spúšťaš skripty na Windows, použi výhradne PowerShell syntax. Žiadny bash curl.
powershell# ✅ SPRÁVNE — PowerShell
$response = Invoke-RestMethod `
  -Uri "https://api.example.com/webhooks/sync" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"contact_id": "123"}'

# ❌ CHYBNE — Bash syntax (nefunguje na Windows CMD)
curl -X POST https://api.example.com/webhooks/sync -d '{"contact_id": "123"}'
Lokálne Testovanie
Aplikácia sa vyvíja cez npm run dev. Po finálnej zmene AI kódu musí byť server reštartovaný:
bash# Reštart dev servera
npm run dev   # Ctrl+C aby sa zastavil, potom znova spustí

# Produkčný build
npm run build

# Spustenie produkčného buildu
npm run start
Git & Deployment
Zmeny sa posielajú do produkcie na pokyn používateľa:
bash# ✅ Len po explicitnom príkaze
git add .
git commit -m "feat: Add contact analyzer tool to registry"
git push origin main

# ← Railway automaticky spustí `npm run build` a redeploy

📋 CHECKLIST PRE KAŽDÝ ZÁSAH
Pred akýmkoľvek zásahom do kódu si prejdi tento checklist:

Registry? Nástroj je registrovaný v src/tools/registry.ts?
Soft Deletes? Žiadne .deleteOne(), iba is_deleted = true alebo status = 'archived'?
Veľkosť súboru? Žiadny súbor nie je väčší ako 150 riadkov?
Violet + Tailwind? UI používa iba lucide-react ikony a Tailwind CSS?
Env variables? Všetky tajomstvá sú v .env.local, nie v kóde?
Directus? Všetky dáta idú cez Directus, žiadne Supabase?
Kontext? ID sa prenášajú bez opakovaného hľadania?
Slovenčina? Error messages a logy sú v slovenčine?

🚨 RED FLAGS — Čo Nerobić
❌ CHYBA✅ NAMIESTO TOHO.deleteOne(id) v kódeupdateItem('table', id, { is_deleted: true })const API_KEY = 'sk_...'process.env.STRIPE_API_KEY300+ riadkov v jednom súboreRozdeliť na index.ts, actions.ts, components.tsxstyle={{ color: 'red' }}className="text-violet-500"import from '@supabase