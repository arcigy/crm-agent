import directus from "@/lib/directus";
import { readItems, readItem, createItem, updateItem } from "@directus/sdk";
import { clerkClient } from "@clerk/nextjs/server";
import { getGmailClient } from "@/lib/google";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// ==========================================
// 1. HELPERS
// ==========================================

async function getGmail(userId: string) {
  const client = await clerkClient();
  const response = await client.users.getUserOauthAccessToken(
    userId,
    "oauth_google",
  );
  const token = response.data[0]?.token;
  if (!token) throw new Error("Google account not connected");
  return getGmailClient(token);
}

function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("09")) {
    cleaned = "+421" + cleaned.substring(1);
  }
  return cleaned;
}

// ==========================================
// 2. EXECUTORS
// ==========================================

export async function executeAtomicTool(
  name: string,
  args: Record<string, any>,
  user: { id: string; emailAddresses: { emailAddress: string }[] },
) {
  try {
    if (name.startsWith("gmail_")) {
      return await executeGmailTool(name, args, user.id);
    }
    if (name.startsWith("db_") || name.startsWith("verify_")) {
      return await executeDbTool(name, args);
    }
    if (name.startsWith("sys_")) {
      return await executeSysTool(name, args);
    }
    if (name.startsWith("drive_")) {
      return await executeDriveTool(name, args, user.id);
    }
    if (name === "ai_deep_analyze_lead") {
      const { classifyEmail } = await import("./ai");
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      const analysis = await classifyEmail(
        args.content,
        userEmail,
        args.sender,
        args.subject,
      );
      return {
        success: true,
        data: analysis,
        message: "AI hĺbková analýza leada bola úspešne dokončená.",
      };
    }
    return { success: false, error: "Tool group not found" };
  } catch (error: any) {
    console.error("Executor Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : JSON.stringify(error),
    };
  }
}

async function executeGmailTool(
  name: string,
  args: Record<string, any>,
  userId: string,
) {
  const gmail = await getGmail(userId);
  switch (name) {
    case "gmail_fetch_list":
      const list = await gmail.users.messages.list({
        userId: "me",
        q: args.q,
        maxResults: args.maxResults || 5,
      });

      const messages = list.data.messages || [];
      if (messages.length === 0) {
        return {
          success: true,
          data: [],
          message: "Neboli nájdené žiadne e-maily zodpovedajúce dopytu.",
        };
      }

      const enrichedMessages = await Promise.all(
        messages.map(async (m) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: "me",
              id: m.id!,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "Date"],
            });
            const msgHeaders = detail.data.payload?.headers;
            return {
              id: m.id,
              threadId: m.threadId,
              subject:
                msgHeaders?.find((h) => h.name === "Subject")?.value ||
                "(No Subject)",
              from:
                msgHeaders?.find((h) => h.name === "From")?.value ||
                "(Unknown)",
              date: msgHeaders?.find((h) => h.name === "Date")?.value || "",
              snippet: detail.data.snippet,
            };
          } catch (e) {
            console.error(e);
            return { id: m.id, error: "Failed to fetch details" };
          }
        }),
      );
      return {
        success: true,
        data: enrichedMessages,
        message: `Bolo nájdených ${enrichedMessages.length} e-mailov.`,
      };

    case "gmail_get_details":
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: args.messageId,
        format: "full",
      });
      const headers = msg.data.payload?.headers;
      return {
        success: true,
        data: {
          id: msg.data.id,
          threadId: msg.data.threadId,
          subject: headers?.find((h) => h.name === "Subject")?.value,
          from: headers?.find((h) => h.name === "From")?.value,
          body: msg.data.snippet,
        },
        message: "Detail e-mailu bol úspešne načítaný.",
      };

    case "gmail_trash_message":
      await gmail.users.messages.trash({ userId: "me", id: args.messageId });
      return {
        success: true,
        message: "E-mail bol presunutý do koša.",
      };

    case "gmail_archive_message":
      await gmail.users.messages.modify({
        userId: "me",
        id: args.messageId,
        requestBody: { removeLabelIds: ["INBOX"] },
      });
      return {
        success: true,
        message: "E-mail bol archivovaný (odstránený z doručenej pošty).",
      };

    case "gmail_reply":
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: args.threadId,
        format: "metadata",
        metadataHeaders: ["From", "Subject"],
      });
      const originalMsg = thread.data.messages?.[0];
      const originalHeaders = originalMsg?.payload?.headers || [];
      const originalFrom =
        originalHeaders.find((h) => h.name === "From")?.value || "";
      const recipientMatch = originalFrom.match(/<(.+?)>/) || [
        null,
        originalFrom,
      ];
      const recipientEmail = recipientMatch[1]?.trim() || originalFrom;
      const originalSubject =
        originalHeaders.find((h) => h.name === "Subject")?.value || "";
      return {
        success: true,
        action: "open_compose",
        compose: {
          to: recipientEmail,
          toName:
            originalFrom
              .replace(/<[^>]+>/, "")
              .trim()
              .replace(/^"|"$/g, "") || recipientEmail,
          subject: originalSubject.startsWith("Re:")
            ? originalSubject
            : `Re: ${originalSubject}`,
          body: args.body,
          threadId: args.threadId,
        },
        message:
          "Oknom s konceptom správy bolo otvorené v CRM. Používateľ teraz môže odpoveď upraviť a odoslať.",
      };

    default:
      throw new Error("Gmail tool not found");
  }
}

async function executeDbTool(name: string, args: Record<string, any>) {
  switch (name) {
    case "db_create_contact":
      let firstName = args.first_name || "";
      let lastName = args.last_name || "";
      if (firstName.includes(" ") && !lastName) {
        const parts = firstName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
      const newContact = (await directus.request(
        createItem("contacts", {
          first_name: firstName,
          last_name: lastName,
          email: args.email || null,
          phone: formatPhoneNumber(args.phone),
          company: args.company || null,
          status: args.status || "new",
          date_created: new Date().toISOString(),
        } as any),
      )) as any;
      return {
        success: true,
        data: { contact_id: newContact.id },
        message: "Kontakt bol úspešne vytvorený v CRM.",
      };

    case "db_update_contact":
      await directus.request(
        updateItem("contacts", args.contact_id, args as any),
      );
      return {
        success: true,
        message: "Údaje kontaktu boli úspešne aktualizované.",
      };

    case "db_search_contacts":
      const searchRes = (await directus.request(
        readItems("contacts", {
          filter: {
            _and: [
              { status: { _neq: "archived" } },
              {
                _or: [
                  { first_name: { _icontains: args.query } },
                  { last_name: { _icontains: args.query } },
                  { email: { _icontains: args.query } },
                  { company: { _icontains: args.query } },
                ],
              },
            ] as any,
          },
          limit: 20,
        }),
      )) as any[];
      return {
        success: true,
        data: searchRes,
        message: `Bolo nájdených ${searchRes.length} kontaktov pre dopyt "${args.query}".`,
      };

    case "db_get_all_contacts":
      const allRes = (await directus.request(
        readItems("contacts", {
          filter: { status: { _neq: "archived" } } as any,
          limit: args.limit || 50,
        }),
      )) as any[];
      return {
        success: true,
        data: allRes,
        message: `Zoznam všetkých kontaktov bol načítaný (${allRes.length}).`,
      };

    case "db_delete_contact":
      await directus.request(
        updateItem("contacts", args.contact_id, {
          status: "archived",
          deleted_at: new Date().toISOString(),
        } as any),
      );
      return {
        success: true,
        message: "Kontakt bol úspešne archivovaný (zmazaný).",
      };

    // --- PROJECTS ---
    case "db_fetch_projects":
      const pFilter: any = { status: { _neq: "archived" } };
      if (args.contact_id) pFilter.contact_id = { _eq: args.contact_id };
      const prRes = (await directus.request(
        readItems("projects", {
          filter: pFilter,
          limit: args.limit || 20,
        }),
      )) as any[];
      return {
        success: true,
        data: prRes,
        message: `Bolo načítaných ${prRes.length} projektov.`,
      };

    case "db_create_project":
      const nProj = (await directus.request(
        createItem("projects", {
          name: args.name,
          contact_id: args.contact_id,
          value: args.value || 0,
          stage: args.stage || "lead",
          date_created: new Date().toISOString(),
        } as any),
      )) as any;
      return {
        success: true,
        data: { project_id: nProj.id },
        message: "Nový projekt bol úspešne založený.",
      };

    case "db_update_project":
      await directus.request(
        updateItem("projects", args.project_id, args as any),
      );
      return {
        success: true,
        message: "Projekt bol úspešne aktualizovaný.",
      };

    case "db_delete_project":
      await directus.request(
        updateItem("projects", args.project_id, {
          status: "archived",
          deleted_at: new Date().toISOString(),
        } as any),
      );
      return { success: true, message: "Projekt bol archivovaný." };

    // --- DEALS ---
    case "db_fetch_deals":
      const dealsRes = (await directus.request(
        readItems("deals", { limit: args.limit || 10 }),
      )) as any[];
      return {
        success: true,
        data: dealsRes,
        message: `Zoznam obchodov načítaný (${dealsRes.length}).`,
      };

    case "db_invoice_deal":
      await directus.request(
        updateItem("deals", args.deal_id, { status: "invoiced" } as any),
      );
      return {
        success: true,
        message: "Stav obchodu bol zmenený na 'Fakturované'.",
      };

    // --- VERIFICATION ---
    case "verify_contact_exists":
    case "verify_contact_by_email":
      const vEmail = args.email || "";
      const vId = args.contact_id;
      const vContacts = (await directus.request(
        readItems("contacts", {
          filter: vId
            ? ({ id: { _eq: vId } } as any)
            : ({ email: { _eq: vEmail } } as any),
        }),
      )) as any[];
      return {
        success: vContacts.length > 0,
        data: vContacts[0] || null,
        message:
          vContacts.length > 0
            ? "Kontakt bol nájdený a overený."
            : "Kontakt sa v databáze nenachádza.",
      };

    case "db_add_contact_comment":
      const contact = (await directus.request(
        readItem("contacts" as any, args.contact_id),
      )) as any;
      const newComment = contact.comments
        ? `${contact.comments}\n\n[Agent]: ${args.comment}`
        : `[Agent]: ${args.comment}`;
      await directus.request(
        updateItem("contacts", args.contact_id, {
          comments: newComment,
        } as any),
      );
      return {
        success: true,
        message: "Komentár bol úspešne pridaný do histórie kontaktu.",
      };

    default:
      return { success: false, error: "DB tool not implemented or found" };
  }
}

async function executeDriveTool(
  name: string,
  args: Record<string, any>,
  userId: string,
) {
  const gmail = await getGmail(userId); // Reusing auth logic
  const auth = (gmail as any).context._options.auth;
  const { google } = await import("googleapis");
  const drive = google.drive({ version: "v3", auth });

  switch (name) {
    case "drive_search_file":
      const res = await drive.files.list({
        q: `name contains '${args.query}' and trashed = false`,
        fields: "files(id, name, webViewLink, mimeType)",
      });
      const files = res.data.files || [];
      return {
        success: true,
        data: files,
        message: `Bolo nájdených ${files.length} súborov na Google Drive.`,
      };

    case "drive_get_file_link":
      const file = await drive.files.get({
        fileId: args.file_id,
        fields: "webViewLink",
      });
      return {
        success: true,
        data: { link: file.data.webViewLink },
        message: "Odkaz na súbor bol úspešne získaný.",
      };

    default:
      throw new Error("Drive tool not found");
  }
}

async function executeSysTool(name: string, args: Record<string, any>) {
  switch (name) {
    case "sys_list_files":
      const targetPath = path.resolve(process.cwd(), args.path || ".");
      if (!targetPath.startsWith(process.cwd()))
        throw new Error("Access denied");
      const files = fs.readdirSync(targetPath, { withFileTypes: true });
      const list = files.map(
        (f) => `${f.isDirectory() ? "[DIR]" : "[FILE]"} ${f.name}`,
      );
      return {
        success: true,
        data: list,
        message: `Štruktúra priečinka ${args.path || "."} bola načítaná.`,
      };

    case "sys_read_file":
      const filePath = path.resolve(process.cwd(), args.path);
      if (!filePath.startsWith(process.cwd())) throw new Error("Access denied");
      const content = fs.readFileSync(filePath, "utf-8");
      return {
        success: true,
        data: content.slice(0, 10000),
        message: "Obsah súboru bol načítaný (limit 10k znakov).",
      };

    case "sys_run_diagnostics":
      const output = execSync(args.command, {
        encoding: "utf-8",
        timeout: 30000,
      });
      return {
        success: true,
        data: output.slice(0, 5000),
        message: "Diagnostický príkaz bol vykonaný.",
      };

    default:
      throw new Error("System tool not found");
  }
}
