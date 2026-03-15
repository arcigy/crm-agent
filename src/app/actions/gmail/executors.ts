"use server";

import { getGmail } from "./client";

export async function executeGmailTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  userEmail?: string,
) {
  try {
    const gmailResult = await getGmail(userId, userEmail);
    
    if (!gmailResult) {
      return {
        success: false,
        error: "GOOGLE_ACCOUNT_NOT_CONNECTED",
        message: "Google účet nie je prepojený. Prosím pripojte ho v nastaveniach.",
      };
    }

    if (gmailResult === "MISSING_REFRESH_TOKEN") {
      return {
        success: false,
        error: "MISSING_REFRESH_TOKEN",
        message: "Tvoje Google pripojenie vypršalo a vyžaduje opätovné schválenie prístupu (consent).",
      };
    }

    const gmail = gmailResult as any; // Narrowed to Gmail client instance


    switch (name) {
      case "gmail_fetch_list":
        const list = await gmail.users.messages.list({
          userId: "me",
          q: args.q as string,
          maxResults: (args.maxResults as number) || 5,
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
          messages.map(async (m: any) => {
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
                  msgHeaders?.find((h: any) => h.name === "Subject")?.value ||
                  "(No Subject)",
                from:
                  msgHeaders?.find((h: any) => h.name === "From")?.value ||
                  "(Unknown)",
                date: msgHeaders?.find((h: any) => h.name === "Date")?.value || "",
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
          id: args.messageId as string,
          format: "full",
        });
        const headers = msg.data.payload?.headers;
        return {
          success: true,
          data: {
            id: msg.data.id,
            threadId: msg.data.threadId,
            subject: headers?.find((h: any) => h.name === "Subject")?.value,
            from: headers?.find((h: any) => h.name === "From")?.value,
            body: msg.data.snippet,
          },
          message: "Detail e-mailu bol úspešne načítaný.",
        };

      case "gmail_trash_message":
        await gmail.users.messages.trash({ userId: "me", id: args.messageId as string });
        return {
          success: true,
          message: "E-mail bol presunutý do koša.",
        };

      case "gmail_archive_message":
        await gmail.users.messages.modify({
          userId: "me",
          id: args.messageId as string,
          requestBody: { removeLabelIds: ["INBOX"] },
        });
        return {
          success: true,
          message: "E-mail bol archivovaný (odstránený z doručenej pošty).",
        };

      case "gmail_send_email":
        return {
          success: true,
          action: "open_compose",
          compose: {
            to: args.to as string,
            toName: args.to as string,
            subject: args.subject as string,
            body: args.body as string,
            threadId: undefined,
          },
          message:
            "Oknom s novým konceptom e-mailu bolo otvorené v CRM.",
        };

      case "gmail_reply":
        const thread = await gmail.users.threads.get({
          userId: "me",
          id: args.threadId as string,
          format: "metadata",
          metadataHeaders: ["From", "Subject"],
        });
        const originalMsg = thread.data.messages?.[0];
        const originalHeaders = originalMsg?.payload?.headers || [];
        const originalFrom =
          originalHeaders.find((h: any) => h.name === "From")?.value || "";
        const recipientMatch = originalFrom.match(/<(.+?)>/) || [
          null,
          originalFrom,
        ];
        const recipientEmail = recipientMatch[1]?.trim() || originalFrom;
        const originalSubject =
          originalHeaders.find((h: any) => h.name === "Subject")?.value || "";
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
            body: args.body as string,
            threadId: args.threadId as string,
          },
          message:
            "Oknom s konceptom správy bolo otvorené v CRM. Používateľ teraz môže odpoveď upraviť a odoslať.",
        };

      case "gmail_forward_email":
        const fwdMsg = await gmail.users.messages.get({
          userId: "me",
          id: args.messageId as string,
          format: "metadata",
          metadataHeaders: ["Subject"],
        });
        const fwdSubject =
          fwdMsg.data.payload?.headers?.find((h: any) => h.name === "Subject")?.value ||
          "";
        
        return {
          success: true,
          action: "open_compose",
          compose: {
            to: args.to as string,
            toName: "",
            subject: fwdSubject.startsWith("Fwd:")
              ? fwdSubject
              : `Fwd: ${fwdSubject}`,
            body: "<br><br>---------- Forwarded message ---------<br>From: ...", // Placeholder
            threadId: undefined, // Up to frontend to handle new thread or strictly link
          },
          message:
            "Oknom s konceptom prepusielania správy bolo otvorené.",
        };

      case "gmail_get_conversation_with_contact":
        const queryEmail = args.email as string;
        const qContact = `from:${queryEmail} OR to:${queryEmail}`;
        const convList = await gmail.users.messages.list({
          userId: "me",
          q: qContact,
          maxResults: (args.limit as number) || 10,
        });

        const cMessages = convList.data.messages || [];
        if (cMessages.length === 0) {
          return {
            success: true,
            data: [],
            message: `S kontaktom ${queryEmail} neboli nájdené žiadne e-maily.`,
          };
        }
        
        // Use any for messages list mapping
        const eMessages = await Promise.all(
          cMessages.map(async (m: any) => {
            const detail = await gmail.users.messages.get({
              userId: "me",
              id: m.id!,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "Date", "To"],
            });
            const h = detail.data.payload?.headers;
            return {
              id: m.id,
              threadId: m.threadId,
              subject: h?.find((x: any) => x.name === "Subject")?.value || "(No Subject)",
              from: h?.find((x: any) => x.name === "From")?.value || "(Unknown)",
              to: h?.find((x: any) => x.name === "To")?.value || "(Unknown)",
              date: h?.find((x: any) => x.name === "Date")?.value || "",
              snippet: detail.data.snippet,
            };
          })
        );
        return {
          success: true,
          data: eMessages,
          message: `Nájdených ${eMessages.length} správ s ${queryEmail}.`,
        };

      case "gmail_modify_labels":
        await gmail.users.messages.modify({
          userId: "me",
          id: args.messageId as string,
          requestBody: {
            addLabelIds: args.addLabelIds as string[],
            removeLabelIds: args.removeLabelIds as string[],
          }
        });
        return {
          success: true,
          message: "Štítky e-mailu boli upravené.",
        };

      case "gmail_save_draft":
        const draftHeaders = [
          `To: ${args.to}`,
          `Subject: ${args.subject}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          args.body as string
        ].join('\n');
        
        await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: {
              raw: Buffer.from(draftHeaders).toString("base64url"),
            }
          }
        });
        return {
          success: true,
          message: `Koncept " ${args.subject} " pre ${args.to} bol úspešne uložený do Gmailu bez zobrazenia UI.`,
        };

      default:
        throw new Error("Gmail tool not found");
    }
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || "";
    if (msg.includes("invalid_grant") || msg.includes("token expired") || msg.includes("credentials")) {
      return {
        success: false,
        error: "GMAIL_TOKEN_EXPIRED",
        message: "Tvoje Gmail pripojenie vypršalo. Je potrebná opätovná autentifikácia.",
      };
    }
    throw error;
  }
}
