import { NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import {
  listFiles,
  listFilesRecursive,
  createFolder,
  findFolder,
  deleteFile,
  renameFile,
  copyFile,
  moveFile,
  searchFoldersByDescription,
} from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId") || undefined;
    const projectName = searchParams.get("projectName");
    const search = searchParams.get("search");

    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token) {
      return NextResponse.json({
        isConnected: false,
        error: "Google account not linked or tokens expired",
      });
    }

    if (search) {
      console.log(`[Drive API] Searching for: "${search}"`);
      const folders = await searchFoldersByDescription(token, search);
      console.log(`[Drive API] Found ${folders.length} folders`);
      if (folders.length > 0) {
        console.log(
          `[Drive API] First folder: ${folders[0].name} (ID: ${folders[0].id})`,
        );
      }
      return NextResponse.json({ isConnected: true, files: folders });
    }

    let targetFolderId = folderId;
    const subfolderName = searchParams.get("subfolderName");
    const recursive = searchParams.get("recursive") === "true";

    // If subfolderName is provided, we look for it inside the parent (folderId)
    if (subfolderName && targetFolderId) {
      const subfolder = await findFolder(token, subfolderName, targetFolderId);
      if (subfolder) targetFolderId = subfolder.id!;
      else {
        // If subfolder not found, return empty list to avoid showing parent files
        return NextResponse.json({
          isConnected: true,
          files: [],
          message: `Subfolder ${subfolderName} not found`,
        });
      }
    }

    if (!targetFolderId) {
      return NextResponse.json({
        isConnected: true,
        files: [],
        message: "No folderId or projectName provided",
      });
    }

    const files = recursive
      ? await listFilesRecursive(token, targetFolderId)
      : await listFiles(token, targetFolderId);

    return NextResponse.json({ isConnected: true, files });
  } catch (error: any) {
    console.error("Drive API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token)
      return NextResponse.json(
        { error: "Google not connected or token expired" },
        { status: 400 },
      );

    const { action, name, parentId, fileId, copyFileId } = await req.json();

    if (action === "copy") {
      if (!copyFileId || !parentId)
        return NextResponse.json(
          { error: "Missing parameters for copy" },
          { status: 400 },
        );
      const file = await copyFile(token, copyFileId, parentId, name);
      return NextResponse.json({ success: true, file });
    }

    const folderId = await createFolder(token, name, parentId);

    return NextResponse.json({ success: true, folderId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token)
      return NextResponse.json(
        { error: "Google not connected or token expired" },
        { status: 400 },
      );

    if (!fileId)
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

    await deleteFile(token, fileId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userEmail = user.emailAddresses[0]?.emailAddress;
    const { getValidToken } = await import("@/lib/google");
    const token = await getValidToken(user.id, userEmail);

    if (!token)
      return NextResponse.json(
        { error: "Google not connected or token expired" },
        { status: 400 },
      );

    const { action, fileId, name, destinationId } = await req.json();

    if (action === "move") {
      if (!fileId || !destinationId)
        return NextResponse.json(
          { error: "Missing parameters for move" },
          { status: 400 },
        );
      await moveFile(token, fileId, destinationId);
      return NextResponse.json({ success: true });
    }

    if (!fileId || !name)
      return NextResponse.json(
        { error: "Missing fileId or name" },
        { status: 400 },
      );

    await renameFile(token, fileId, name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
