import { handlers } from "@/auth"

// Explicit route to handle Google Callback explicitly
// This bypasses potential issues with dynamic [...nextauth] route matching on some hosting environments
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    return handlers.GET(req);
}

export async function POST(req: Request) {
    return handlers.POST(req);
}
