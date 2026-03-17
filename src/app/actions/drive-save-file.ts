"use server";

import { Readable } from "stream";
import directus, { getDirectusErrorMessage } from "@/lib/directus";
import { createItem } from "@directus/sdk";

type SaveToDriveResult =
  | { success: true; fileId: string; fileUrl: string }
  | { success: false; error: string };

function decodeGmailBase64Url(data: string): Buffer {
  const safe = (data || "").toString();
  const b64 = safe.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function escapeDriveQueryLiteral(value: string): string {
  return (value || "").toString().replace(/'/g, "\\'");
}

async function getOrCreateFolderPath(params: {
  drive: any;
  rootFolderId: string;
  path: string; // "Faktúry/2026/Marec"
}): Promise<string> {
  const parts = (params.path || "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3); // enforce max 3 levels

  let currentParentId = params.rootFolderId;

  for (const folderNameRaw of parts) {
    const folderName = folderNameRaw.slice(0, 120); // safety cap
    const escaped = escapeDriveQueryLiteral(folderName);

    const existing = await params.drive.files.list({
      q: `name='${escaped}' and '${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id,name)",
      pageSize: 1,
      spaces: "drive",
    });

    if (existing.data.files?.length) {
      currentParentId = existing.data.files[0].id;
      continue;
    }

    const created = await params.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [currentParentId],
      },
      fields: "id",
    });

    currentParentId = created.data.id!;
  }

  return currentParentId;
}

export async function saveFileToDrive(input: {
  gmailMessageId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  drivePath: string;
  description?: string;
  userEmail: string;
  clerkUserId: string;
}): Promise<SaveToDriveResult> {
  try {
    if (!process.env.GOOGLE_DRIVE_CRM_FILES_FOLDER_ID) {
      return { success: false, error: "Missing GOOGLE_DRIVE_CRM_FILES_FOLDER_ID env var" };
    }

    const { getValidToken, getGmailClient, getDriveClient } = await import("@/lib/google");
    const token = await getValidToken(input.clerkUserId, input.userEmail);
    if (!token) return { success: false, error: "Google account not connected or token expired" };

    // 1) Download attachment from Gmail
    const gmail = await getGmailClient(token);
    const att = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: input.gmailMessageId,
      id: input.attachmentId,
    });

    const attData = att.data.data;
    if (!attData) return { success: false, error: "Attachment has no data" };
    const fileBuffer = decodeGmailBase64Url(attData);

    // 2) Ensure folder path in Drive (under configured root folder)
    const drive = await getDriveClient(token);
    const folderId = await getOrCreateFolderPath({
      drive,
      rootFolderId: process.env.GOOGLE_DRIVE_CRM_FILES_FOLDER_ID,
      path: input.drivePath,
    });

    // 3) Upload file
    const uploaded = await drive.files.create({
      requestBody: {
        name: input.filename,
        description: input.description || "",
        parents: [folderId],
      },
      media: {
        mimeType: input.mimeType || "application/octet-stream",
        body: Readable.from(fileBuffer),
      },
      fields: "id,webViewLink,name",
    });

    const fileId = uploaded.data.id;
    const fileUrl = uploaded.data.webViewLink;
    if (!fileId || !fileUrl) {
      return { success: false, error: "Drive upload succeeded but response missing file link" };
    }

    // 4) Best-effort: store reference in Directus (if collection exists)
    try {
      await directus.request(
        createItem("drive_files" as any, {
          gmail_message_id: input.gmailMessageId,
          file_id: fileId,
          filename: input.filename,
          drive_path: input.drivePath,
          description: input.description || null,
          file_url: fileUrl,
          uploaded_by: input.userEmail,
          date_uploaded: new Date().toISOString(),
        }),
      );
    } catch (e) {
      // Non-fatal: Drive already has the file
      console.warn("[Drive Save] Failed to create Directus drive_files record:", getDirectusErrorMessage(e));
    }

    return { success: true, fileId, fileUrl };
  } catch (err: any) {
    console.error("[Drive Save] Error:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

