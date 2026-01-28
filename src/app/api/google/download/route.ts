import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { downloadFile, listFiles } from '@/lib/google-drive';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get('fileId');
        const mimeType = searchParams.get('mimeType');
        const name = searchParams.get('name') || 'download';

        if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(user.id, 'oauth_google');
        const token = response.data[0]?.token;

        if (!token) return NextResponse.json({ error: 'Google not connected' }, { status: 400 });

        // Is Folder? -> ZIP
        if (mimeType === 'application/vnd.google-apps.folder') {
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            // List all files in folder
            const files = await listFiles(token, fileId);

            // Create a pass-through stream to pipe archive to response
            const stream = new Readable().wrap(archive);

            // Process files async
            (async () => {
                for (const file of files) {
                    if (file.mimeType !== 'application/vnd.google-apps.folder') {
                        try {
                            const fileStream: any = await downloadFile(token, file.id!);
                            archive.append(fileStream, { name: file.name! });
                        } catch (e) {
                            console.error(`Error downloading file ${file.name}`, e);
                        }
                    }
                }
                archive.finalize();
            })();

            return new NextResponse(stream as any, {
                headers: {
                    'Content-Disposition': `attachment; filename="${name}.zip"`,
                    'Content-Type': 'application/zip',
                },
            });
        }

        // Is File? -> Standard Download
        else {
            const stream: any = await downloadFile(token, fileId);

            return new NextResponse(stream, {
                headers: {
                    'Content-Disposition': `attachment; filename="${name}"`,
                    'Content-Type': mimeType || 'application/octet-stream',
                },
            });
        }

    } catch (error: any) {
        console.error('Download error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
