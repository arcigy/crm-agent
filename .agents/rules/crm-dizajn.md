---
trigger: always_on
---

# CRM Agent Customizations – Architecture, Design & Tools
**Source of Truth** pre všetky budúce customizácie, rozšírenia a úpravy CRM systému.

---

## 📋 Obsah
1. [Dizajnový Jazyk & UI](#dizajnový-jazyk--ui)
2. [Architektúra Systému](#architektúra-systému)
3. [Registry & Nástroje](#registry--nástroje)
4. [Pravidlá Vývoja](#pravidlá-vývoja)

---

## 🎨 Dizajnový Jazyk & UI

### Farbová Schéma – Violet Branding

Všetky komponenty **musia** dodržiavať jednotnú Violet/Fialovú tému. Toto nie je odporúčanie – je to **povinný štandard**.

| Element | Farby | Príklady |
|---------|-------|---------|
| **Primary Actions** | `violet-500`, `violet-600` | Tlačidlá, ikony, indikátory aktivity |
| **Backgrounds** | `bg-slate-900`, `bg-[#0f1115]`, `bg-[#0b0c10]` | Panely, dialógy, hlavný container |
| **Hover Effects** | `hover:bg-violet-900/20`, `bg-violet-950/30` | Jemné, jemné fialové zvýraznenie |
| **Borders** | `border-violet-900/30`, `border-white/5`, `border-white/10` | Nikdy tvrdé čiary – len jemné oddelenie |
| **Text – Primárny** | `text-white` | Hlavný obsah, názvy |
| **Text – Sekundárny** | `text-slate-400`, `text-white/60` | Opisy, doplňujúce informácie |
| **Shadows** | `shadow-lg shadow-violet-900/20` | Hĺbka a elegancia |

### Komponenty & Štýly

**Požiadavky na všetky nové komponenty:**

- ✅ **Glassmorphism:** Použitie semi-transparentných pozadí s `backdrop-blur`
- ✅ **Zaoblené Rohy:** Minimum `rounded-lg`, preferovane `rounded-xl`
- ✅ **Prechody:** Všetky hover/focus stavy musia mať `transition-all duration-200`
- ✅ **Ikony:** **Len a len** `lucide-react` – žiadne iné knižnice
- ✅ **Spacing:** Používajte Tailwind scale: `p-4`, `gap-3`, `my-2` (konzistentne)

### Príklad Komponentu (Template)

```jsx
// ✅ SPRÁVNE
export function MyComponent() {
  return (
    <div className="bg-slate-900 border border-violet-900/30 rounded-xl p-6 shadow-lg shadow-violet-900/20">
      <h2 className="text-white text-lg font-semibold">Názov</h2>
      <p className="text-slate-400 text-sm mt-2">Popis...</p>
      <button className="mt-4 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-all duration-200">
        Akcia
      </button>
    </div>
  );
}
```

---

## 🏗️ Architektúra Systému

### The Black Box Tool System

CRM je postavený na **modulárnom, nezávislom systéme nástrojov** s centrálnym Registry.

#### Princípy

1. **Registry Pattern**
   - Všetky nástroje sú registrované v: `/src/tools/registry.ts`
   - Každý nástroj má jedinečné `id` (napr. `google-maps`, `projects`, `booking`)
   - Žiadne hardcodované importy – všetko prechádza Registry

2. **Nezávislosť Nástrojov**
   - Nástroj je **samostatný modul** – jeho chyba/výpadok nesmie ovplyvniť ostatné
   - Odstránenie/deaktivácia nástroja musí byť bezpečné (soft-deletes)
   - Žiadne krosz-zavislosť medzi nástrojmi

3. **Routing & URL Schéma**
   ```
   /dashboard/[tool-id]
   Príklady:
   - /dashboard/google-maps
   - /dashboard/projects
   - /dashboard/booking
   ```

4. **Dátové Úložisko – Directus (PostgreSQL)**
   - **Jediný zdroj dát:** Directus
   - Nikdy Supabase (iba s explicitným feature-flag odstraňovacím procesom)
   - Všetky tabuľky nástrojov majú reláciu na primárnu tabuľku `contacts`
   - **Soft-deletes:** Všetky dáta sú maľované označením `deleted_at` alebo `is_deleted`

5. **Autentifikácia & Autorizácia**
   - Role: `admin`, `user`, `guest`
   - Oprávnenia sú definované v `registry.ts` ako `allowedRoles` a `allowedEmails`
   - Bez výnimiek – ak nie si v zozname, nemáš prístup

6. **Paywall & Premiumové Nástroje (Stripe)**
   - Premium nástroje majú `stripePriceId` definovaný v `registry.ts`
   - Webhook z Stripe odomyká prístup na základe `subscription.status`
   - **Žiadny hardcoded prístup** – všetko cez Stripe validáciu
   - Chybný `stripePriceId` = nástroj je nedostupný

---

## 🛠️ Registry & Nástroje

### Aktuálny Zoznam Nástrojov

Každý nástroj má túto štruktúru v `registry.ts`:

```typescript
{
  id: string;                    // Jedinečný ID (kebab-case)
  name: string;                  // Ľudčí názov
  description: string;           // Krátky popis
  icon: LucideIcon;             // Iba lucide-react ikona
  category: string;             // "productivity" | "sales" | "admin" | "file" | "finance"
  isPremium: boolean;           // Je premium?
  stripePriceId?: string;       // Stripe cena (len ak isPremium: true)
  allowedRoles?: string[];      // ["admin", "user"]
  allowedEmails?: string[];     // Obmedzenie na konkrétne e-maily
  enabled: boolean;             // Je aktivný?
  path: string;                 // URL cesta v dashboarde
}
```

### Registrovaní Nástroje (Tabuľka)

| ID | Názov | Kategória | Premium | Admin Only | Stav |
|----|-------|-----------|---------|-----------|------|
| `google-maps` | Google Maps Scraper | admin | ❌ | ✅ Limitované | ✅ Aktívny |
| `projects` | Projekty | productivity | ❌ | ❌ | ✅ Aktívny |
| `calendar` | Kalendár | productivity | ✅ | ❌ | ✅ Aktívny |
| `leads` | Leads Inbox | sales | ✅ | ❌ | ✅ Aktívny |
| `booking` | Booking System | productivity | ✅ | ❌ | ✅ Aktívny |
| `todo` | To Do | productivity | ❌ | ❌ | ✅ Aktívny |
| `notes` | Notes | productivity | ❌ | ❌ | ✅ Aktívny |
| `files` | Moje Súbory | file | ✅ | ❌ | ✅ Aktívny |
| `invoicing` | Fakturácia | finance | ✅ | ❌ | ✅ Aktívny |
| `quotes` | Cenové Ponuky | finance | ✅ | ❌ | ✅ Aktívny |
| `contracts` | Zmluvy | finance | ✅ | ❌ | ✅ Aktívny |
| `outreach` | Cold Outreach | sales | ✅ | ✅ Limitované | ✅ Aktívny |
| `dummy-tool` | Dummy Tool | admin | ❌ | ✅ | ✅ Testovací |

### Detaily Jednotlivých Nástrojov

#### 1. Google Maps Scraper (`google-maps`)
- **Účel:** Automatizované získavanie kontaktov z Google Maps (Safe Mode)
- **Kategória:** Admin/Sales
- **Oprávnenia:** Iba admin role + **obmedzené e-maily** (predefinované v registry)
- **Premium:** Nie
- **Dátová Tabuľka:** `google_maps_scrapes`
- **API Integrácia:** Google Places API

#### 2. Projekty (`projects`)
- **Účel:** Správa klientskych projektov, sledovanie štádií a termínov
- **Kategória:** Productivity
- **Premium:** Nie
- **Dátová Tabuľka:** `projects`
- **Funkcie:** Vytvorenie, úprava, archivizácia, priraďovanie tímom

#### 3. Kalendár (`calendar`)
- **Účel:** Plná synchronizácia s Google Kalendárom, správa úloh a stretnutí
- **Kategória:** Productivity
- **Premium:** Áno (vyžaduje `stripePriceId`)
- **Dátová Tabuľka:** `calendar_events`
- **API Integrácia:** Google Calendar API

#### 4. Leads Inbox (`leads`)
- **Účel:** Synchronizácia s Gmailom, správa potenciálnych klientov z e-mailov
- **Kategória:** Sales
- **Premium:** Áno
- **Dátová Tabuľka:** `leads`
- **API Integrácia:** Gmail API

#### 5. Booking System (`booking`)
- **Účel:** Vlastný rezervačný systém (ako Cal.com) pre plánovanie stretnutí
- **Kategória:** Productivity
- **Premium:** Áno
- **Dátová Tabuľka:** `bookings`
- **Funkcionalita:** Časové sloty, notifikácie, potvrdenie

#### 6. To Do (`todo`)
- **Účel:** Osobný task manažér s dennou agendou
- **Kategória:** Productivity
- **Premium:** Nie
- **Dátová Tabuľka:** `todos`

#### 7. Notes (`notes`)
- **Účel:** Rýchle cloud poznámky
- **Kategória:** Productivity
- **Premium:** Nie
- **Dátová Tabuľka:** `notes`

#### 8. Moje Súbory (`files`)
- **Účel:** Správa všetkých firemných súborov s API prepojením na Google Drive
- **Kategória:** File Management
- **Premium:** Áno
- **Dátová Tabuľka:** `files`
- **API Integrácia:** Google Drive API

#### 9. Fakturácia (`invoicing`)
- **Účel:** Generovanie PDF faktúr a interných faktúr
- **Kategória:** Finance
- **Premium:** Áno
- **Dátová Tabuľka:** `invoices`
- **Funkcie:** Šablóny, PDF export, e-mailové odoslanie

#### 10. Cenové Ponuky (`quotes`)
- **Účel:** Tvorba a správa custom cenových ponúk pre klientov
- **Kategória:** Finance
- **Premium:** Áno
- **Dátová Tabuľka:** `quotes`

#### 11. Zmluvy (`contracts`)
- **Účel:** Generovanie a správa klientskych zmlúv
- **Kategória:** Finance
- **Premium:** Áno
- **Dátová Tabuľka:** `contracts`
- **Šablóny:** Vlastné alebo predpripravené

#### 12. Cold Outreach (`outreach`)
- **Účel:** Automatizovaný e-mailový cold outreach s AI analýzou odpovedí
- **Kategória:** Sales
- **Premium:** Áno
- **Oprávnenia:** Obmedzené admin e-maily
- **Dátová Tabuľka:** `outreach_campaigns`
- **AI Integrácia:** Analýza odpovedí, scoring

#### 13. Dummy Tool (`dummy-tool`)
- **Účel:** Vývojársky testovací tool na overovanie oprávnení a systému
- **Kategória:** Admin
- **Premium:** Nie
- **Stav:** Iba na vývoj – odstrániť pred produkciou

---

## 📝 Pravidlá Vývoja

### Pred Vytvorením Nového Nástroja

- [ ] Prečítaj si existujúce nástroje v `registry.ts`
- [ ] Skontroluj, či neexistuje podobný nástroj
- [ ] Rozhodni: je to **Premium** alebo **Free**?
- [ ] Zistí, či ide o **admin-only** alebo pre **všetkých**
- [ ] Priprav Directus tabuľku (s `created_at`, `updated_at`, `deleted_at`)
- [ ] Registruj nástroj v `registry.ts` s jasným popisom

### Počas Vývoja

1. **Dodržiavaj Dizajnový Jazyk**
   - Violet/Fialové farby
   - Glassmorphism, zaoblené rohy
   - Iba lucide-react ikony
   - Tailwind spacing & typography

2. **Štruktúra Nového Nástroja**
   ```
   /src/tools/[tool-id]/
   ├── page.tsx           (Hlavná komponenta)
   ├── components/        (Podkomponenty)
   ├── hooks/            (Custom hooks)
   ├── actions/          (Server actions)
   ├── types.ts          (TypeScript typy)
   └── utils.ts          (Pomocné funkcie)
   ```

3. **Autentifikácia**
   - Všetky resty skontroluj v `middleware.ts`
   - Skontroluj `allowedRoles` a `allowedEmails` z `registry.ts`
   - Vráť 403 Forbidden, ak nemá prístup

4. **Dáta & API**
   - Používaj Directus REST/GraphQL
   - Vždy rešpektuj soft-deletes (`is_deleted = false`)
   - Vytváraj dáta s `created_at`, `updated_at`

5. **Premium & Paywall**
   - Ak je `isPremium: true`, skontroluj Stripe webhook
   - Ak `subscription.status !== "active"`, zakáž prístup
   - Vráť upgrade prompt s ľudčí správou

### Po Vývoji – Checklist

- [ ] Je nástroj v `registry.ts`?
- [ ] Majú všetky komponenty fialovú tému?
- [ ] Sú všetky ikony z `lucide-react`?
- [ ] Je pridaná Directus tabuľka?
- [ ] Sú implementované soft-deletes?
- [ ] Je testovaná autentifikácia?
- [ ] Je dokumentovaná API?
- [ ] Je testovaný Stripe paywall (ak je premium)?

---

## 🔒 Bezpečnosť & Best Practices

### Povinné Opatrenia

| Položka | Požiadavka | Príklad |
|---------|-----------|--------|
| **Autentifikácia** | Middleware check v každom routes | `middleware.ts` validuje token |
| **Autorizácia** | Role-based z registry | `allowedRoles: ["admin", "user"]` |
| **Dáta** | Vždy cez Directus, nikdy hardcoded | `fetch('/api/directus/...')` |
| **Soft-deletes** | Označenie miesto mazania | `is_deleted = true, deleted_at = now()` |
| **Encryption** | Citlivé dáta šifrované | API Keys, tokens v `.env` |
| **CORS** | Riadené domény | Iba trusted API endpointy |

---

## 📞 Kontakt & Zmeny

- **Ak chceš pridať nástroj:** Updatuj `registry.ts` + toto dokumentu
- **Ak chceš zmeniť farby:** Zmeň Tailwind config (a toto dokumentu)
- **Ak chceš resetovať:** Vráť sa na tento dokument – je to Source of Truth

---

**Dátum poslednej aktualizácie:** 22. február 2026  
**Verzia:** 1.0.0 (FINAL – Violet Branding Standard)