
import { NextRequest, NextResponse } from 'next/server';
import { uploadVCard } from '@/app/actions/contacts';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.redirect(new URL('/dashboard/contacts?error=No file received', req.url));
        }

        const text = await file.text();

        // Use our action logic
        await uploadVCard(text);

        // Redirect back to dashboard with success query param
        return NextResponse.redirect(new URL('/dashboard/contacts?success_import=true', req.url));
    } catch (error) {
        console.error('Share target error:', error);
        return NextResponse.redirect(new URL('/dashboard/contacts?error=Import failed', req.url));
    }
}
