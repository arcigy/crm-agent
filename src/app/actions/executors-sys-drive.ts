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

export async function executeSysTool(name: string, args: Record<string, any>) {
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
    default:
      throw new Error(`Tool ${name} not found in System executors`);
  }
}
