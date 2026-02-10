import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { createFile } from '@/lib/google-drive';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userEmail = user.emailAddresses[0]?.emailAddress;
        const { getValidToken } = await import("@/lib/google");
        const token = await getValidToken(user.id, userEmail);

        if (!token) return NextResponse.json({ error: 'Google not connected or token expired' }, { status: 400 });

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const folderId = formData.get('folderId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Use stream for better memory management (though createFile currently takes buffer)
        // For larger files, we might need a stream-based approach in lib/google-drive, 
        // but for now, let's Stick to the existing lib function which accepts Buffer.

        // Wait, createFile in lib/google-drive.ts accepts "content: string | Buffer".
        // The googleapis library's media.body can accept a stream, string, or buffer. 
        // Readable.from(buffer) wraps it in a stream.

        const stream = Readable.from(buffer);

        const result = await createFile(token, file.name, file.type, stream as any, folderId);

        return NextResponse.json({ success: true, file: result });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
