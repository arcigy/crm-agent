import { ToolDefinition } from "./agent-types";

export const INBOX_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "gmail_fetch_list",
      description: "Získa zoznam ID a snippetov správ z Gmailu.",
      parameters: {
        type: "object",
        properties: {
          q: {
            type: "string",
            description: "Vyhľadávací dopyt (napr. 'from:petra', 'is:unread')",
          },
          maxResults: { type: "number", default: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_get_details",
      description:
        "Získa kompletný obsah e-mailu (body, subject, sender) podľa ID.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string" },
        },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_reply",
      description:
        "Pripraví odpoveď na email a otvorí compose okno v CRM. Tento nástroj NIKDY neposiela email priamo - vždy len pripraví náhľad pre používateľa, ktorý ho môže upraviť a odoslať manuálne.",
      parameters: {
        type: "object",
        properties: {
          threadId: {
            type: "string",
            description: "ID vlákna na ktoré sa odpovedá",
          },
          body: {
            type: "string",
            description:
              "Text odpovede v HTML alebo čistý text - AI predvyplní tento text",
          },
        },
        required: ["threadId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_trash_message",
      description: "Presunie e-mail do koša.",
      parameters: {
        type: "object",
        properties: { messageId: { type: "string" } },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_archive_message",
      description: "Archivuje e-mail (odstráni z inboxu).",
      parameters: {
        type: "object",
        properties: { messageId: { type: "string" } },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ai_deep_analyze_lead",
      description:
        "Hĺbková AI analýza textu e-mailu (extrakcia entít, úmyslu a prioritizácia).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string" },
          subject: { type: "string" },
          sender: { type: "string" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_save_analysis",
      description: "Uloží výsledok AI analýzy leada do CRM databázy.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          intent: { type: "string" },
          summary: { type: "string" },
          next_step: { type: "string" },
          sentiment: { type: "string" },
        },
        required: ["message_id", "intent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_lead_info",
      description: "Aktualizuje dáta o analýze leada v CRM.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          priority: { type: "string", enum: ["vysoka", "stredna", "nizka"] },
          next_step: { type: "string" },
        },
        required: ["message_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_create_contact",
      description: "Vytvorí nový kontakt v CRM databáze.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Krstné meno" },
          last_name: { type: "string", description: "Priezvisko" },
          email: { type: "string", description: "Email adresa" },
          phone: { type: "string", description: "Telefónne číslo" },
          company: { type: "string", description: "Názov firmy" },
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "lost"],
            default: "new",
          },
          comments: { type: "string", description: "Poznámky ku kontaktu" },
        },
        required: ["first_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_search_contacts",
      description: "Vyhľadá kontakty v CRM podľa mena, emailu alebo firmy.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text na vyhľadanie" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_get_all_contacts",
      description: "Získa zoznam všetkých kontaktov v CRM.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximálny počet kontaktov",
            default: 50,
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_delete_contact",
      description: "Vymaže kontakt z CRM databázy (soft delete).",
      parameters: {
        type: "object",
        properties: {
          contact_id: {
            type: "number",
            description: "ID kontaktu na vymazanie",
          },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_forward_email",
      description: "Prepošle e-mail na zadanú adresu.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string" },
          to: { type: "string", description: "Emailová adresa príjemcu" },
        },
        required: ["messageId", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_contact",
      description: "Aktualizuje údaje existujúceho kontaktu.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          company: { type: "string" },
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "lost"],
          },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_add_contact_comment",
      description: "Pridá komentár (poznámku) ku kontaktu.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "number" },
          comment: {
            type: "string",
            description: "Text komentára na pridanie",
          },
        },
        required: ["contact_id", "comment"],
      },
    },
  },
];

export const DEAL_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_create_deal",
      description: "Vytvorí nový obchod (deal).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          contact_id: { type: "number" },
          value: { type: "number" },
          description: { type: "string" },
        },
        required: ["name", "contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_fetch_deals",
      description: "Načíta zoznam obchodov (deals).",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10 },
          status: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_deal",
      description: "Aktualizuje obchod (deal).",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "number" },
          status: { type: "string" },
          value: { type: "number" },
        },
        required: ["deal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_invoice_deal",
      description: "Vystaví faktúru k obchodu (zmení stav na Invoiced).",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "number" },
        },
        required: ["deal_id"],
      },
    },
  },
];

export const PROJECT_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "db_fetch_projects",
      description: "Načíta zoznam projektov.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10 },
          contact_id: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_create_project",
      description: "Vytvorí nový projekt.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          contact_id: { type: "number" },
          value: { type: "number" },
          deadline: { type: "string" },
        },
        required: ["name", "contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_update_project",
      description: "Aktualizuje projekt.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number" },
          stage: { type: "string" },
          value: { type: "number" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "db_delete_project",
      description: "Vymaže projekt (soft delete).",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number" },
        },
        required: ["project_id"],
      },
    },
  },
];

export const FILE_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "drive_search_file",
      description: "Vyhľadá súbor v Google Drive (napr. faktúru, zmluvu).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Názov súboru" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "drive_get_file_link",
      description: "Získa odkaz na stiahnutie súboru.",
      parameters: {
        type: "object",
        properties: {
          file_id: { type: "string" },
        },
        required: ["file_id"],
      },
    },
  },
];

export const SYSTEM_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "sys_list_files",
      description: "Zobrazí štruktúru súborov v projekte (tree view).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relatívna cesta (predvolene koreň .)",
          },
          depth: { type: "number", default: 2 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sys_read_file",
      description: "Prečíta obsah konkrétneho súboru v projekte.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sys_run_diagnostics",
      description:
        "Spustí diagnostický príkaz v termináli (napr. 'npm run build', 'git status'). Len na sledovanie stavu.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
        required: ["command"],
      },
    },
  },
];

export const VERIFIER_ATOMS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "verify_contact_exists",
      description: "Overí či kontakt s daným ID existuje v databáze.",
      parameters: {
        type: "object",
        properties: {
          contact_id: {
            type: "number",
            description: "ID kontaktu na overenie",
          },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_contact_by_email",
      description: "Overí či kontakt s daným emailom existuje v databáze.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email kontaktu na overenie" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_contact_by_name",
      description: "Overí či kontakt s daným menom existuje v databáze.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Krstné meno" },
          last_name: { type: "string", description: "Priezvisko" },
        },
        required: ["first_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_recent_contacts",
      description:
        "Získa zoznam posledných N vytvorených kontaktov pre overenie.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Počet kontaktov", default: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_project_exists",
      description: "Overí či projekt s daným ID existuje.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "ID projektu" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_database_health",
      description: "Overí pripojenie k databáze a vráti základné štatistiky.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const ALL_ATOMS = [
  ...INBOX_ATOMS,
  ...DEAL_ATOMS,
  ...PROJECT_ATOMS,
  ...FILE_ATOMS,
  ...SYSTEM_ATOMS,
  ...VERIFIER_ATOMS,
];
