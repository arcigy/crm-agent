import { google } from 'googleapis';

export async function getDriveClient(token: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth });
}

export async function listFiles(token: string, folderId?: string) {
    const drive = await getDriveClient(token);

    // If no folderId, list files in 'root'. 
    // drive.file scope only shows files created by this app.
    // drive.readonly or drive scope is needed for the full drive.
    const q = folderId ? `'${folderId}' in parents and trashed = false` : "'root' in parents and trashed = false";

    try {
        console.log(`[Drive Lib] Querying Drive with q: ${q}`);
        const res = await drive.files.list({
            q,
            fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, size)',
            orderBy: 'folder, name',
            pageSize: 100
        });

        console.log(`[Drive Lib] API Response status: ${res.status}`);
        console.log(`[Drive Lib] Found ${res.data.files?.length || 0} files. User might need broader scopes if they expect to see existing files.`);
        return res.data.files || [];
    } catch (err: any) {
        console.error('[Drive Lib] listFiles failed:', err.response?.data || err.message);
        throw err;
    }
}

export async function createFolder(token: string, name: string, parentId?: string) {
    const drive = await getDriveClient(token);
    const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
    };

    const res = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    });

    return res.data.id;
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
