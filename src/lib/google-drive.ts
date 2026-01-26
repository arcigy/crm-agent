import { google } from 'googleapis';

export async function getDriveClient(token: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth });
}

export async function listFiles(token: string, folderId?: string) {
    const drive = await getDriveClient(token);
    const q = folderId ? `'${folderId}' in parents and trashed = false` : "trashed = false";

    const res = await drive.files.list({
        q,
        fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, size)',
        orderBy: 'folder, name',
    });

    return res.data.files || [];
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
