import { handlers } from "@/auth"

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    return handlers.GET(req);
}

export async function POST(req: Request) {
    return handlers.POST(req);
}
