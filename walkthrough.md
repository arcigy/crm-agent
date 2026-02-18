# Walkthrough: Opravy Agenta, Pamäte a Výkonu

Vyriešil som problémy s rýchlosťou, pamäťou aj zamŕzaním rozhrania. Agent je teraz pripravený na komplexné úlohy s maximálnou kvalitou plánovania.

## Hlavné Vylepšenia

### 1. Kvalitné Plánovanie (Gemini 2.0 Pro) 🧠

Na tvoju požiadavku som vrátil Orchestrátora na model **Gemini 2.0 Pro (Experimental)**.

- **Dôvod**: Hoci generovanie trvá dlhšie (cca 10-15s), plány sú výrazne kvalitnejšie, agent lepšie chápe kontext a robí menej chýb pri komplexných príkazoch.
- **Model**: `gemini-2.0-pro-exp-02-05`.

### 2. Debug Logy v Reálnom Čase ⚡

Už žiadne čakanie na "čiernu skrinku". Rozhranie už nezamŕza.

- **Backend**: Implementoval som streamovanie. Agent posiela logy (Router, Orchestrator, Executor) okamžite, ako sa dejú.
- **Frontend**: Debug konzola na `/dashboard/agent-debug` teraz vypisuje kroky priebežne.

### 3. Dlhodobá Pamäť 🧠

Agent si už dokáže zapamätať fakty o používateľoch.

- **Nástroj**: `sys_capture_memory` je plne zaregistrovaný.
- **Použitie**: Ak agentovi povieš napr. "Zapamätaj si, že Branislav preferuje faktúry v PDF", uloží si to do Directusu (`ai_memories`).

### 4. Diagnostika 422 Auth Chyby ❌

Chyba `Unprocessable Entity (422)` znamená, že používateľ v Clerku **nemá aktívne prepojený Google OAuth účet**.

- **Riešenie**: Je potrebné sa odhlásiť a prihlásiť znova cez Google, alebo v nastaveniach Clerk dashboardu overiť prepojenie. Do kódu som pridal jasnejšie chybové hlásenie pre tento prípad.

## Overenie

- [x] Orchestrátor na modely Pro (Experimental).
- [x] Streamovanie logov (vyskúšaj v Debug chate).
- [x] Registrácia `sys_capture_memory`.
- [x] Fix pushnutý na GitHub pre deployment.

Všetko je pripravené na testovanie na ceste `/dashboard/agent-debug`.
