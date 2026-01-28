import { google } from 'googleapis';

export async function getDriveClient(token: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth });
}

export async function findFolder(token: string, name: string, parentId?: string) {
    const drive = await getDriveClient(token);
    let q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
        q += ` and '${parentId}' in parents`;
    }

    const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive'
    });

    return res.data.files?.[0] || null;
}

export async function ensureFolder(token: string, name: string, parentId?: string) {
    const existing = await findFolder(token, name, parentId);
    if (existing) return existing.id!;
    return await createFolder(token, name, parentId);
}

export async function listFiles(token: string, folderId?: string) {
    const drive = await getDriveClient(token);
    const q = folderId ? `'${folderId}' in parents and trashed = false` : "'root' in parents and trashed = false";

    try {
        const res = await drive.files.list({
            q,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, size)',
            orderBy: 'folder, name',
            pageSize: 100
        });
        return res.data.files || [];
    } catch (err: any) {
        console.error('[Drive Lib] listFiles failed:', err.response?.data || err.message);
        throw err;
    }
}

export async function createFolder(token: string, name: string, parentId?: string, description?: string) {
    const drive = await getDriveClient(token);
    const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
    };
    if (description) {
        fileMetadata.description = description;
    }

    const res = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    return res.data.id!;
}

/**
 * Creates the full project hierarchy:
 * CRM Root -> Year -> Project Folder -> Deep Subfolders
 */
export async function setupProjectStructure(token: string, data: {
    projectName: string,
    projectNumber: string,
    year: string,
    contactName: string
}) {
    // 1. Ensure Main Root (ArciGy CRM Files)
    const rootId = await ensureFolder(token, 'ArciGy CRM Files');

    // 2. Ensure Year Folder (e.g., 2025)
    const yearId = await ensureFolder(token, data.year, rootId);

    // 3. Create Project Folder (001_Project_Name)
    const folderName = `${data.projectNumber}_${data.projectName.replace(/\s+/g, '_')}`;
    const projectId = await createFolder(token, folderName, yearId, `Client: ${data.contactName}`);

    // 4. Create Deep Subfolders Structure
    // 01_Zmluvy_a_Faktury
    const f01 = await createFolder(token, '01_Zmluvy_a_Faktury', projectId);
    await createFolder(token, 'Zmluvy', f01);
    await createFolder(token, 'Faktury', f01);

    // 02_Podklady_od_Klienta
    await createFolder(token, '02_Podklady_od_Klienta', projectId);

    // 03_Pracovna_Zlozka
    const f03 = await createFolder(token, '03_Pracovna_Zlozka', projectId);
    await createFolder(token, 'Docasne_Slozka', f03);
    await createFolder(token, 'Trvale_Slozka', f03);

    // 04_Finalne_Vystupy
    await createFolder(token, '04_Finalne_Vystupy', projectId);

    return projectId;
}

export async function createFile(token: string, name: string, mimeType: string, content: string | Buffer, parentId?: string) {
    const drive = await getDriveClient(token);
    const fileMetadata = {
        name,
        parents: parentId ? [parentId] : undefined,
    };
    const media = {
        mimeType,
        body: content,
    };

    const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    return res.data;
}

export async function deleteFile(token: string, fileId: string) {
    const drive = await getDriveClient(token);
    await drive.files.delete({ fileId });
    return true;
}

export async function renameFile(token: string, fileId: string, newName: string) {
    const drive = await getDriveClient(token);
    await drive.files.update({
        fileId,
        requestBody: { name: newName }
    });
    return true;
}

export async function copyFile(token: string, fileId: string, parentId: string, name?: string) {
    const drive = await getDriveClient(token);
    const res = await drive.files.copy({
        fileId,
        requestBody: {
            name,
            parents: [parentId]
        },
        fields: 'id, name, mimeType, webViewLink, iconLink, thumbnailLink'
    });
    return res.data;
}

export async function moveFile(token: string, fileId: string, destinationFolderId: string) {
    const drive = await getDriveClient(token);

    // 1. Get current parents to remove
    const file = await drive.files.get({
        fileId,
        fields: 'parents'
    });

    const previousParents = file.data.parents?.join(',') || '';

    // 2. Update with new parent
    const res = await drive.files.update({
        fileId,
        addParents: destinationFolderId,
        removeParents: previousParents,
        fields: 'id, parents'
    });

    return res.data;
}
