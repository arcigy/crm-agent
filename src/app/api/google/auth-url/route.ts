import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(req: Request) {
    try {
        const url = await getAuthUrl(undefined);
        return NextResponse.json({ url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
