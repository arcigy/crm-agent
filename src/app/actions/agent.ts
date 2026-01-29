"use server";

import directus from "@/lib/directus";
import { readItems, createItem, updateItem, deleteItems } from "@directus/sdk";
import { currentUser } from "@clerk/nextjs/server";
import { getIsolatedAIContext } from "@/lib/ai-context";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================================
// 1. MOLECULE: CRM CORE (Contacts & Projects)
// ==========================================

const CRM_CORE_TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "crm_search_contacts",
      description: "Hľadá kontakty v CRM podľa mena, firmy alebo emailu.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_create_contact",
      description: "Vytvorí nový kontakt v CRM.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          company: { type: "string" },
          status: { type: "string", enum: ["lead", "active", "archived"] },
        },
        required: ["first_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_get_projects_and_deals",
      description: "Získa zoznam projektov a obchodov (deals) užívateľa.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_update_project_stage",
      description: "Aktualizuje štádium projektu.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          stage: {
            type: "string",
            enum: ["planning", "in_progress", "completed", "cancelled"],
          },
        },
        required: ["project_id", "stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_get_stats",
      description: "Vypočíta finančné štatistiky CRM.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ==========================================
// 2. MOLECULE: INBOX & LEADS (Doručená pošta)
// ==========================================

const INBOX_LEADS_TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "inbox_list_leads",
      description: "Získa zoznam analyzovaných emailov a leadov.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "inbox_details",
      description:
        "Získa detail analýzy konkrétnej správy (úmysel, rozpočet, ďalší krok).",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
        },
        required: ["message_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "inbox_classify_message",
      description: "Analyzuje text správy pomocou AI a extrahuje lead dáta.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Body of the message" },
          subject: { type: "string" },
          sender: { type: "string" },
        },
        required: ["content"],
      },
    },
  },
];

const AGENT_TOOLS = [...CRM_CORE_TOOLS, ...INBOX_LEADS_TOOLS];

// ==========================================
// 3. TOOL EXECUTION (Molecule Logic)
// ==========================================

async function executeTool(name: string, args: any, userEmail: string) {
  try {
    // A. CRM CORE LOGIC
    if (name.startsWith("crm_")) {
      switch (name) {
        case "crm_search_contacts":
          // @ts-ignore
          const contacts = await directus.request(
            readItems("contacts", {
              filter: {
                _or: [
                  { first_name: { _icontains: args.query } },
                  { last_name: { _icontains: args.query } },
                  { company: { _icontains: args.query } },
                  { email: { _icontains: args.query } },
                ],
                deleted_at: { _null: true },
              },
              limit: 10,
            }),
          );
          return { success: true, data: contacts };

        case "crm_create_contact":
          // @ts-ignore
          const newContact = await directus.request(
            createItem("contacts", {
              ...args,
              date_created: new Date().toISOString(),
            }),
          );
          revalidatePath("/dashboard/contacts");
          return { success: true, data: newContact };

        case "crm_get_projects_and_deals":
          // @ts-ignore
          const projects = await directus.request(
            readItems("projects", {
              filter: { deleted_at: { _null: true } },
              limit: 20,
            }),
          );
          return { success: true, data: projects };

        case "crm_update_project_stage":
          // @ts-ignore
          await directus.request(
            updateItem("projects", args.project_id, {
              stage: args.stage,
              date_updated: new Date().toISOString(),
            }),
          );
          revalidatePath("/dashboard/projects");
          revalidatePath("/dashboard/deals");
          return { success: true };

        case "crm_get_stats":
          // @ts-ignore
          const allProjects = await directus.request(
            readItems("projects", {
              filter: { deleted_at: { _null: true } },
            }),
          );
          const stats = (allProjects as any[]).reduce(
            (acc, p) => {
              const val = Number(p.value) || 0;
              acc.total += val;
              if (p.paid) acc.paid += val;
              else acc.unpaid += val;
              return acc;
            },
            { total: 0, paid: 0, unpaid: 0 },
          );
          return { success: true, data: stats };
      }
    }

    // B. INBOX & LEADS LOGIC
    if (name.startsWith("inbox_")) {
      switch (name) {
        case "inbox_list_leads":
          // @ts-ignore
          const leads = await directus.request(
            readItems("email_analysis", {
              sort: ["-date_created"],
              limit: 10,
            }),
          );
          return { success: true, data: leads };

        case "inbox_details":
          // @ts-ignore
          const detail = await directus.request(
            readItems("email_analysis", {
              filter: { message_id: { _eq: args.message_id } },
              limit: 1,
            }),
          );
          return { success: true, data: detail?.[0] || null };

        case "inbox_classify_message":
          const { classifyEmail } = await import("./ai");
          const analysis = await classifyEmail(
            args.content,
            userEmail,
            args.sender,
            args.subject,
          );
          return { success: true, data: analysis };
      }
    }

    return { success: false, error: "Molecule tool not found" };
  } catch (error: any) {
    console.error(`Tool Execution Error [${name}]:`, error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 3. MAIN AGENT LOOP (Dispatcher)
// ==========================================

export async function chatWithAgent(messages: any[]) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { error: "Unauthorized" };
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // 1. Get Isolated Context (Variables for the prompt)
    const context = await getIsolatedAIContext(email, "GLOBAL");

    const systemPrompt = `
Si **ArciGy Agent**, vysoko inteligentný operačný systém tohto CRM. Tvojím cieľom je pomáhať používateľovi ovládať systém efektívne.

### TVOJA IDENTITA
- Používateľ: ${context.user_nickname} (${context.user_profession})
- Firma: ${context.business_company_name}
- Tón: ${context.communication_tone}

### TVOJA PAMÄŤ & KONTEXT
${context.learned_memories.join("\n")}

### TVOJE MOŽNOSTI
Máš priamy prístup k CRM nástrojom (Functions). Ak používateľ chce niečo vyhľadať, vytvoriť alebo zistiť štatistiky, použi príslušný tool. 

### PRAVIDLÁ
1. Ak niečo urobíš (napr. vytvoríš kontakt), jasne to potvrď.
2. Ak chýbajú údaje pre tool (napr. meno pri tvorbe kontaktu), vypýtaj si ich.
3. Buď stručný a vecný, presne podľa tvojho tónu.
4. Tvoje Custom Inštrukcie: ${context.user_custom_instructions}
`;

    // 2. Initial Model Call
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost efficient as requested
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      temperature: 0.2, // Higher precision for tool calling
    });

    const message = response.choices[0].message;

    // 3. Handle Tool Calls
    if (message.tool_calls) {
      const results = [];
      for (const toolCall of message.tool_calls) {
        const result = await executeTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          email,
        );
        results.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
      }

      // 4. Second Model Call (Final Answer with data)
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          message as any,
          ...(results as any),
        ],
      });

      return {
        role: "assistant",
        content: secondResponse.choices[0].message.content,
        toolResults: results, // Optional: UI can use this to show feedback
      };
    }

    return { role: "assistant", content: message.content };
  } catch (error: any) {
    console.error("Agent Chat Error:", error);
    return { error: error.message };
  }
}

// ==========================================
// 4. STANDALONE ACTIONS (For backward compatibility & direct UI calls)
// ==========================================

export async function agentCreateContact(data: {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
}) {
  try {
    // @ts-ignore
    const res = await directus.request(
      createItem("contacts", {
        ...data,
        date_created: new Date().toISOString(),
      }),
    );
    revalidatePath("/dashboard/contacts");
    return { success: true, contact: res };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function agentCreateDeal(data: {
  name: string;
  value: number;
  stage: string;
  contact_email?: string;
}) {
  try {
    // @ts-ignore
    const res = await directus.request(
      createItem("projects", {
        project_type: data.name,
        value: data.value,
        stage: "planning", // Default stage
        date_created: new Date().toISOString(),
      }),
    );
    revalidatePath("/dashboard/projects");
    return { success: true, deal: res };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function agentCheckAvailability(timeRange: string) {
  return {
    success: false,
    error: "Google Calendar integration pending Directus migration",
  };
}

export async function agentScheduleEvent(data: {
  title: string;
  start_time: string;
  duration_min: number;
}) {
  return {
    success: false,
    error: "Google Calendar integration pending Directus migration",
  };
}

export async function agentSendEmail(data: {
  recipient: string;
  subject: string;
  body_html: string;
  threadId?: string;
}) {
  return {
    success: false,
    error: "Gmail integration pending Directus migration",
  };
}
