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

    try {
        // Fetch all contacts from Supabase
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('status', 'published'); // Only active contacts

        if (error) {
            console.error('[CardDAV] DB Error:', error);
            return new NextResponse('Internal Server Error', { status: 500 });
        }

        const responses = (contacts || []).map((contact: any) => {
            // Helper to clean strings
            const clean = (s: string) => (s || '').trim();

            // Construct vCard
            const vcard = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${clean(contact.first_name)} ${clean(contact.last_name)}`,
                `N:${clean(contact.last_name)};${clean(contact.first_name)};;;`,
                contact.email ? `EMAIL;TYPE=INTERNET:${clean(contact.email)}` : '',
                contact.phone ? `TEL;TYPE=CELL:${clean(contact.phone)}` : '',
                contact.company ? `ORG:${clean(contact.company)}` : '',
                contact.comments ? `NOTE:${clean(contact.comments)}` : '',
                `UID:urn:uuid:${contact.id}`, // Using ID as UUID, in prod user real UUIDs for better sync
                `REV:${new Date().toISOString()}`,
                'END:VCARD'
            ].filter(Boolean).join('\r\n');

            const href = `/api/dav/addressbooks/user/default/${contact.id}.vcf`;
            const etag = `"${contact.updated_at ? new Date(contact.updated_at).getTime() : '0'}"`;

            return `
    <D:response>
        <D:href>${href}</D:href>
        <D:propstat>
            <D:prop>
                <D:getetag>${etag}</D:getetag>
                <C:address-data>${vcard}</C:address-data>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>`;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
${responses}
</D:multistatus>`;

        return new NextResponse(xml, {
            status: 207,
            headers: {
                'DAV': '1, 3, addressbook',
                'Content-Type': 'application/xml; charset=utf-8'
            }
        });

    } catch (e) {
        console.error('[CardDAV] Report Failed', e);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

async function handleRequest(req: NextRequest, params: { path?: string[] }) {
    const method = req.method;
    const pathSegments = params.path || [];
    // Normalize path: always starts with /api/dav, no trailing slash
    const pathStr = '/api/dav' + (pathSegments.length > 0 ? '/' + pathSegments.join('/') : '');

    console.log(`[CardDAV] ${method} ${pathStr}`);

    const davHeaders = {
        'DAV': '1, 3, addressbook',
        'Allow': 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, REPORT',
    };

    if (method === 'OPTIONS') {
        return new NextResponse(null, { status: 200, headers: davHeaders });
    }

    if (method === 'PROPFIND') {
        // iOS Discovery Logic

        // 0. Root /api/dav Discovery -> Point to User Principal
        if (pathStr === '/api/dav' || pathStr === '/api/dav/') {
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <D:response>
        <D:href>/api/dav/</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype><D:collection/></D:resourcetype>
                <D:current-user-principal>
                    <D:href>/api/dav/principals/user/</D:href>
                </D:current-user-principal>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
</D:multistatus>`;
            return new NextResponse(xml, { status: 207, headers: { ...davHeaders, 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        // 1. Principal URL Handling
        if (pathStr.includes('/principals/user')) {
            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <D:response>
        <D:href>${pathStr}/</D:href>
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

        // 2. Addressbook Home (Listing books)
        if (pathStr.endsWith('/addressbooks/user')) {
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
                <C:supported-report-set>
                    <C:supported-report><C:addressbook-multiget/></C:supported-report>
                </C:supported-report-set>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
</D:multistatus>`;
            return new NextResponse(xml, { status: 207, headers: { ...davHeaders, 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        // 3. Specific Addressbook 'default'
        if (pathStr.endsWith('/default')) {
            const depth = req.headers.get('Depth') || '0';

            // Sync Token / CTag - Timestamp of last update to table
            // In a real app we'd query MAX(updated_at)
            const ctag = `${Date.now()}`;

            let childrenXml = '';

            // If Depth: 1, we must list all resources (contacts)
            if (depth === '1') {
                try {
                    const { data: contacts } = await supabase.from('contacts').select('id, updated_at').eq('status', 'published');
                    childrenXml = (contacts || []).map((c: any) => `
    <D:response>
        <D:href>/api/dav/addressbooks/user/default/${c.id}.vcf</D:href>
        <D:propstat>
            <D:prop>
                <D:getetag>"${c.updated_at ? new Date(c.updated_at).getTime() : '0'}"</D:getetag>
                <D:resourcetype/>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>`).join('\n');
                } catch (e) { console.error('Error fetching contacts for Depth:1', e); }
            }

            const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav" xmlns:CS="http://calendarserver.org/ns/">
    <D:response>
        <D:href>/api/dav/addressbooks/user/default/</D:href>
        <D:propstat>
            <D:prop>
                <D:resourcetype>
                    <D:collection/>
                    <C:addressbook/>
                </D:resourcetype>
                <D:supported-report-set>
                    <D:supported-report><C:addressbook-multiget/></D:supported-report>
                </D:supported-report-set>
                <CS:getctag>${ctag}</CS:getctag>
            </D:prop>
            <D:status>HTTP/1.1 200 OK</D:status>
        </D:propstat>
    </D:response>
    ${childrenXml}
</D:multistatus>`;
            return new NextResponse(xml, { status: 207, headers: { ...davHeaders, 'Content-Type': 'application/xml; charset=utf-8' } });
        }

        // Fallback for root or unknown
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse('OK', { status: 200, headers: davHeaders });
}
