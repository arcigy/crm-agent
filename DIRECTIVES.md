# Chyby a Riešenia

## Stripe Build Error
**Chyba:** `Error: Neither apiKey nor config.authenticator provided` v `/api/webhooks/stripe`
**Príčina:** Stripe SDK je inicializované globálne v `lib/stripe.ts` a vyžaduje `STRIPE_SECRET_KEY`. Pri builde na Railway (kde env vars nemusia byť dostupné počas build fázy, alebo sú zle nastavené) to spôsobí pád, pretože Next.js sa snaží predrenderovať alebo analyzovať API routes.
**Riešenie:** Uistiť sa, že Stripe SDK je inicializované bezpečne, alebo použiť "lazy" prístup, kedy sa inicializuje až pri prvom použití, resp. poskytnúť fallback hodnotu pre build time.

## Supabase Deprecation
**Stav:** Supabase bola úplne odstránená a nahradená Directusom.
**Pravidlo:** Všetky nové funkcie musia používať Directus SDK (`@/lib/directus`). Nepridávať žiadne importy zo `@supabase/supabase-js` alebo `@supabase/ssr`.

