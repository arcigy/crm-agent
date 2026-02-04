# 🤖 Primary AI Directive (ANTIGRAVITY)

Tento súbor obsahuje tvoje primárne inštrukcie. Vždy ich dodržiavaj pri každej interakcii s týmto projektom.

## 🚀 Workflow Protocol (Branching Strategy)

Pracujeme na tomto projekte dvaja súčasne. Aby nedošlo k prepísaniu zmien:

1. **PULL MAIN**: Pred začatím práce v novej branchi vždy urob `git pull origin main` na main branchi.
2. **BRANCHING**: Všetka práca prebieha vo vetve `antigravity-dev` (alebo v špecifických feature branchiach).
3. **MERGE TO MAIN**: Po dokončení úlohy a tvojom schválení mergnem zmeny do `main`, aby sa spustil deployment na Railway.
4. **NO AUTO-PUSH**: Pushuj zmeny na branch iba na požiadanie, alebo po dokončení logického celku.

## 🎨 Design & Frontend

1. **VZHĽAD**: NIKDY nemeň existujúci vizuál/design systému, pokiaľ to nie je súčasťou zadania. Zachovávaj stanovenú estetiku a Tailwind konfiguráciu.
2. **FRONTEND ONLY**: Sústreď sa na vývoj frontendu a UI komponentov v súlade s pravidlami v `GEMINI.md`.

## 💾 Core Rules

- **150 Line Limit**: Súbory nad 150 riadkov rozdeľuj na menšie moduly.
- **Directus Native**: Používaj výhradne Directus SDK pre prácu s dátami.
- **Mobile-First PWA**: UI musí byť optimalizované pre iOS Safari bez adresného riadku.

---

### Posledná aktualizácia: 04.02.2026
