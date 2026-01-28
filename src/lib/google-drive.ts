import { google } from 'googleapis';

export async function getDriveClient(token: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth });
}

export async function findFolder(token: string, name: string, parentId?: string) {
    const drive = await getDriveClient(token);
    let q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
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
 * CRM Root -> Year -> Project Folder -> [Subfolders]
 */
export async function setupProjectStructure(token: string, data: {
    projectName: string,
    projectNumber: string,
    year: string,
    contactName: string
}) {
    // 1. Ensure Main Root
    const rootId = await ensureFolder(token, 'ArciGy CRM Files');

    // 2. Ensure Year Folder
    const yearId = await ensureFolder(token, data.year, rootId);

    // 3. Create Project Folder (001_Project_Name)
    const folderName = `${data.projectNumber}_${data.projectName.replace(/\s+/g, '_')}`;
    const projectId = await createFolder(token, folderName, yearId, `Client: ${data.contactName}`);

    // 4. Create Subfolders
    const subfolders = [
        '01_Zmluvy_a_Faktury',
        '02_Podklady_od_Klienta',
        '03_Pracovna_Zlozka',
        '04_Finalne_Vystupy'
    ];

    for (const sub of subfolders) {
        await createFolder(token, sub, projectId);
    }

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
