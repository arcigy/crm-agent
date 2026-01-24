import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CardDAV Protocol Handler
 * Minimal implementation to accept contacts from iOS/Android
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return handleRequest(req, await params);
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return handleRequest(req, await params);
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return handleRequest(req, await params);
}

export async function PROPFIND(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return handleRequest(req, await params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path } = await params;

    const body = await req.text();
    const headers = req.headers;
    const userAgent = headers.get('user-agent') || 'Unknown';

    // Check if it's a vCard upload
    const filename = path?.[path.length - 1];

    if (filename && filename.endsWith('.vcf')) {
        console.log(`[CardDAV] Receiving contact: ${filename}`);

        const uid = filename.replace('.vcf', '');

        // Save to Staging Queue
        // Mock user_id for dev environment simplicity
        // In prod this would come from Auth Basic header
        const { error } = await supabase
            .from('mobile_sync_queue')
            .upsert({
                carddav_uid: uid,
                vcard_data: body,
                device_agent: userAgent,
                status: 'pending'
            }, { onConflict: 'carddav_uid' });

        if (error) {
            console.error('[CardDAV] Error saving contact:', error);
            return new NextResponse('Internal Server Error', { status: 500 });
        }

        // Return ETag
        const etag = `"${Date.now()}"`;
        return new NextResponse(null, {
            status: 201,
            headers: {
                'ETag': etag
            }
        });
    }

    return new NextResponse('Created', { status: 201 });
}


// REPORT is used to query the address book (sync)
export async function REPORT(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path } = await params;
    const pathStr = '/api/dav/' + (path || []).join('/');

    console.log(`[CardDAV] REPORT ${pathStr}`);

    // iOS sends an XML body asking for specific properties (getetag, address-data)
    // For now, we return a valid but EMPTY address book response to satisfy the initial sync.
    // In the future, we will query Supabase 'mobile_sync_queue' or 'contacts' here and inject them.

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <!-- No responses means empty address book -->
</D:multistatus>`;

    return new NextResponse(xml, {
        status: 207,
        headers: {
            'DAV': '1, 3, addressbook',
            'Content-Type': 'application/xml; charset=utf-8'
        }
    });
}

async function handleRequest(req: NextRequest, params: { path?: string[] }) {
    const method = req.method;
    const pathSegments = params.path || [];
    const pathStr = '/api/dav/' + pathSegments.join('/');

    console.log(`[CardDAV] ${method} ${pathStr}`);

    const davHeaders = {
        'DAV': '1, 3, addressbook',
        'Allow': 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, REPORT',
    };

    if (method === 'OPTIONS') {
        return new NextResponse(null, { status: 200, headers: davHeaders });
    }

    /* ... PROPFIND ... */

    if (method === 'PROPFIND') {
        // iOS Discovery Logic

        // 1. If asking for Principal (User config) -> Point to Addressbook Home
        if (pathStr.includes('principals')) {
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <D:response>
        <D:href>${pathStr}</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype><D:collection/></D:resourcetype>
                <D:current-user-privilege-set><D:privilege><D:read/></D:privilege></D:current-user-privilege-set>
                <C:addressbook-home-set>
                    <D:href>/api/dav/addressbooks/user/</D:href>
                </C:addressbook-home-set>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
</D:multistatus>`;
            return new NextResponse(xml, { status: 207, headers: { ...davHeaders, 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        // 2. If asking for Addressbook Home (Listing books) -> Return the 'default' book
        if (pathStr.endsWith('/addressbooks/user/') || pathStr.endsWith('/addressbooks/user')) {
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <D:response>
        <D:href>/api/dav/addressbooks/user/</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype><D:collection/></D:resourcetype>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
    <D:response>
        <D:href>/api/dav/addressbooks/user/default/</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype>
                    <D:collection/>
                    <C:addressbook/>
                </D:resourcetype>
                <D:displayname>CRM Contacts</D:displayname>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
</D:multistatus>`;
            return new NextResponse(xml, { status: 207, headers: { ...davHeaders, 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        // 3. If asking for the specific book 'default' -> Confirm it exists
        if (pathStr.includes('default')) {
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <D:response>
        <D:href>${pathStr}</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype>
                    <D:collection/>
                    <C:addressbook/>
                </D:resourcetype>
                <D:supported-report-set>
                    <D:supported-report>
                        <D:report><C:addressbook-multiget/></D:report>
                    </D:supported-report>
                </D:supported-report-set>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
</D:multistatus>`;
            return new NextResponse(xml, { status: 207, headers: { ...davHeaders, 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        // Fallback
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse('OK', { status: 200, headers: davHeaders });
}
