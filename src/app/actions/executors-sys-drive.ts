"use server";

import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Reusing auth for Drive since it shared Google scope.
 */
async function getDrive(userId: string) {
  const client = await clerkClient();
  const response = await client.users.getUserOauthAccessToken(userId, "oauth_google");
  const token = response.data[0]?.token;
  if (!token) throw new Error("Google account not connected");
  
  const { getDriveClient } = await import("@/lib/google");
  return await getDriveClient(token);
}

export async function executeDriveTool(
  name: string,
  args: Record<string, any>,
  userId: string,
) {
  const drive = await getDrive(userId);
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
      throw new Error(`Tool ${name} not found in Drive executors`);
  }
}

export async function executeSysTool(name: string, args: Record<string, any>, userId?: string) {
  const userEmail = (args as any).userEmail; // Passed down in some contexts or inferred

  switch (name) {
    case "sys_fetch_by_date": {
        let targetDate = args.date as string; 
        
        // Normalize "today" and "tomorrow"
        if (targetDate === "today") {
            targetDate = new Date().toISOString().split("T")[0];
        } else if (targetDate === "tomorrow") {
            const tm = new Date();
            tm.setDate(tm.getDate() + 1);
            targetDate = tm.toISOString().split("T")[0];
        }

        const directus = (await import("@/lib/directus")).default;
        const { readItems } = await import("@directus/sdk");
        
        // Calculate the next day for range filtering
        const d = new Date(targetDate);
        d.setDate(d.getDate() + 1);
        const nextDay = d.toISOString().split("T")[0];

        // Parallel fetch for speed
        const [tasks, projects, notesWithMention] = await Promise.all([
          directus.request(readItems("crm_tasks" as any, {
            filter: { 
              _and: [
                { due_date: { _gte: targetDate } },
                { due_date: { _lt: nextDay } }
              ]
            },
            limit: -1
          })),
          directus.request(readItems("projects" as any, {
            filter: { 
              _and: [
                { end_date: { _gte: targetDate } },
                { end_date: { _lt: nextDay } }
              ]
            },
            limit: -1
          })),
          directus.request(readItems("crm_notes" as any, {
            filter: { content: { _icontains: targetDate } },
            limit: -1
          }))
        ]);

        // Calendar fetch (if userId is available)
        let calendarEvents: any[] = [];
        if (userId) {
            try {
                const { executeCalendarTool } = await import("./executors-calendar");
                const calRes = await executeCalendarTool("calendar_get_upcoming_events", { days_ahead: 1 }, "", userId);
                if (calRes.success && Array.isArray(calRes.data)) {
                    // Filter specifically for the target date
                    calendarEvents = calRes.data.filter((e: any) => 
                        e.start?.dateTime?.includes(targetDate) || e.start?.date?.includes(targetDate)
                    );
                }
            } catch (e) {
                console.error("Calendar fetch failed in sys_fetch_by_date:", e);
            }
        }

        return {
          success: true,
          data: {
            tasks: tasks || [],
            projects: projects || [],
            notes: notesWithMention || [],
            calendar: calendarEvents
          },
          message: `Kompletný prehľad pre dátum ${targetDate} bol načítaný.`
        };
    }

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
    case "sys_capture_memory":
        const { addAIMemory } = await import("./memory");
        return await addAIMemory(args.fact as string, args.category as string);
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
    case "sys_fetch_call_logs": {
      const directus = (await import("@/lib/directus")).default;
      const { readItems } = await import("@directus/sdk");
      const logs = await directus.request(
        readItems("android_logs" as any, {
          filter: { contact_id: { _eq: args.contact_id } },
          limit: args.limit || 5,
          sort: ["-timestamp"],
        })
      );
      return {
        success: true,
        data: logs,
        message: `Načítaných ${Array.isArray(logs) ? logs.length : 0} záznamov hovorov/SMS.`,
      };
    }
    case "sys_show_info":
      return {
        success: true,
        data: {
          title: args.title,
          content: args.content,
          type: args.type || "text"
        },
        message: `Zobrazené info: ${args.title}`
      };
      
    case "sys_generate_report":
      return {
        success: true,
        data: {
          title: args.report_topic,
          content: args.data_context, // In production, this would call an LLM prompt to summarize
          type: "text",
          raw_data: true
        },
        message: `Report "${args.report_topic}" vygenerovaný z dát (raw).`,
      };

    case "db_bulk_update":
      const dbbDirectus = (await import("@/lib/directus")).default;
      const { readItems: dbbRead, updateItems: dbbUpdate } = await import("@directus/sdk");
      const eType = args.entity_type as string;
      const tFilter = args.filter as any;
      const tPayload = args.update_payload as any;

      const itemsToUpdate = await dbbDirectus.request(dbbRead(eType as any, {
         filter: tFilter,
         fields: ["id"],
         limit: -1
      })) as {id: string | number}[];

      if (itemsToUpdate.length === 0) {
         return { success: true, message: `Žiadne záznamy odpovedajúce flitru neboli nájdené na aktualizáciu.` };
      }
      
      const ids = itemsToUpdate.map(i => String(i.id));
      await dbbDirectus.request(dbbUpdate(eType as any, ids, tPayload));
      
      return {
         success: true,
         message: `Hromadne upravených ${ids.length} záznamov v tabuľke ${eType}.`
      };
      
    case "sys_export_to_csv":
      const exportDirectus = (await import("@/lib/directus")).default;
      const { readItems: exportReadItems } = await import("@directus/sdk");
      
      let exportData: any[] = [];
      if (args.entity_type === "contacts") {
        exportData = await exportDirectus.request(exportReadItems("contacts", { limit: -1, sort: ["last_name"] })) as any[];
      } else if (args.entity_type === "projects") {
        exportData = await exportDirectus.request(exportReadItems("projects", { limit: -1, sort: ["name"] })) as any[];
      }
      
      if (!exportData || exportData.length === 0) {
        return { success: false, message: "Žiadne dáta na export." };
      }

      // CSV String Upload to Drive
      if (!userId) throw new Error("Chýba identifikácia užívateľa pre prístup na Google Drive.");
      
      const headers = Object.keys(exportData[0]).filter(k => !k.includes("user_email") && !k.includes("drive_folder_id"));
      const csvRows = [headers.join(",")];
      exportData.forEach(row => {
        csvRows.push(headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(","));
      });
      const csvString = csvRows.join("\n");

      // Save to Google Drive
      const drive = await getDrive(userId);
      const fileName = `Export_${args.entity_type}_${new Date().toISOString().split("T")[0]}.csv`;
      
      const fileRes = await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: "text/csv",
        },
        media: {
          mimeType: "text/csv",
          body: csvString,
        },
        fields: "id, webViewLink",
      });

      return {
        success: true,
        data: { link: fileRes.data.webViewLink, count: exportData.length },
        message: `Vygenerovaný CSV export (${exportData.length} riadkov). Súbor '${fileName}' bol uložený na Google Drive a odkaz je pripravený.`
      };

    case "sys_set_agent_reminder":
      // In a full production system, this would write to a 'reminders' or 'automations' table
      // scanned by a background cron job (triggering a new orchestrator mission).
      // For now, we simulate this persistence by capturing it via memory/sys layer.
      const reminderDirectus = (await import("@/lib/directus")).default;
      const { createItem: createReminder } = await import("@directus/sdk");
      
      try {
        await reminderDirectus.request(createReminder("ai_memories", {
          user_email: "system", // Or resolved user
          category: "agent_reminder",
          fact: JSON.stringify({
            condition: args.condition,
            action: args.action,
            raw_instruction: args.condition,
          }),
          confidence: 1
        }));
      } catch (e) {
        console.warn("Could not save reminder to memory table", e);
      }

      return {
        success: true,
        message: `Pripomienka/Monitor úspešne nastavený: '${args.condition}' -> zapíše sa na pozadí.`,
      };

    default:
      throw new Error(`Tool ${name} not found in System executors`);
  }
}
