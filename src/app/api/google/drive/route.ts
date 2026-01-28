import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { listFiles, createFolder, deleteFile, renameFile } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get('folderId') || undefined;
        const projectName = searchParams.get('projectName');

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) {
            return NextResponse.json({ isConnected: false, error: 'Google account not linked' });
        }

        // If no folderId provided but projectName exists, we might want to "Find or Create" a folder
        // For now, let's just list the root or a specific folder
        const files = await listFiles(token, folderId);

        return NextResponse.json({ isConnected: true, files });

    } catch (error: any) {
        console.error('Drive API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 400 });

        const { name, parentId } = await req.json();
        const folderId = await createFolder(token, name, parentId);

        return NextResponse.json({ success: true, folderId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get('fileId');

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 400 });

        if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });

        await deleteFile(token, fileId);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 400 });

        const { fileId, name } = await req.json();

        if (!fileId || !name) return NextResponse.json({ error: 'Missing fileId or name' }, { status: 400 });

        await renameFile(token, fileId, name);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
