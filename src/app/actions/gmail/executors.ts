"use server";

import { getGmail } from "./client";

export async function executeGmailTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
) {
  const gmail = await getGmail(userId);
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
        id: args.messageId as string,
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
        fwdMsg.data.payload?.headers?.find((h) => h.name === "Subject")?.value ||
        "";
      
      // Get full content for forwarding (simplified for now, usually we'd need full format)
      // For privacy/simplicity, we just open compose with FW: Subject
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

    default:
      throw new Error("Gmail tool not found");
  }
}
