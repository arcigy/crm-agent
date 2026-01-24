export async function GET() {
    return handle();
}

export async function PROPFIND() {
    return handle();
}

function handle() {
    return NextResponse.redirect(new URL('/api/dav', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), 301);
}
