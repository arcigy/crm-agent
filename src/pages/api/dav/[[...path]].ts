import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CardDAV Protocol Handler (Pages Router Version)
 * We moved here from App Router because PROPFIND method is not supported there.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const method = req.method;
    const { path } = req.query;
    const pathSegments = Array.isArray(path) ? path : (path ? [path] : []);
    const pathStr = '/api/dav' + (pathSegments.length > 0 ? '/' + pathSegments.join('/') : '');

    console.log(`[CardDAV] ${method} ${pathStr}`);

    // CORS & DAV Headers
    res.setHeader('DAV', '1, 3, addressbook');
    res.setHeader('Allow', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, REPORT');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, REPORT');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Depth, SOAPAction');

    // --- BASIC AUTH CHALLENGE ---
    if (!req.headers.authorization) {
        res.setHeader('WWW-Authenticate', 'Basic realm="CRM Contacts"');
        return res.status(401).send('Unauthorized');
    }

    if (method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (method === 'PROPFIND') {
        return handlePropfind(req, res, pathStr);
    }

    if (method === 'REPORT') {
        return handleReport(req, res, pathStr);
    }

    if (method === 'PUT') {
        return handlePut(req, res, pathStr);
    }

    if (method === 'DELETE') {
        return handleDelete(req, res, pathStr);
    }

    // Fallback
    return res.status(200).send('OK');
}

async function handlePropfind(req: NextApiRequest, res: NextApiResponse, pathStr: string) {
    const depth = req.headers.depth || '0';

    // 0. Root /api/dav Discovery
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
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(207).send(xml);
    }

    // 1. Principal URL
    if (pathStr.includes('/principals/user')) {
        const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
    <D:response>
        <D:href>${pathStr.endsWith('/') ? pathStr : pathStr + '/'}</D:href>
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
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(207).send(xml);
    }

    // 2. Addressbook Home
    if (pathStr.endsWith('/addressbooks/user') || pathStr.endsWith('/addressbooks/user/')) {
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
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(207).send(xml);
    }

    // 3. Specific Addressbook 'default'
    if (pathStr.includes('/default')) {
        const ctag = `${Date.now()}`;
        let childrenXml = '';

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
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(207).send(xml);
    }

    return res.status(404).end();
}


async function handleReport(req: NextApiRequest, res: NextApiResponse, pathStr: string) {
    try {
        const { data: contacts } = await supabase
            .from('contacts')
            .select('*')
            .eq('status', 'published');

        const responses = (contacts || []).map((contact: any) => {
            const clean = (s: string) => (s || '').trim();
            const vcard = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${clean(contact.first_name)} ${clean(contact.last_name)}`,
                `N:${clean(contact.last_name)};${clean(contact.first_name)};;;`,
                contact.email ? `EMAIL;TYPE=INTERNET:${clean(contact.email)}` : '',
                contact.phone ? `TEL;TYPE=CELL:${clean(contact.phone)}` : '',
                contact.company ? `ORG:${clean(contact.company)}` : '',
                contact.comments ? `NOTE:${clean(contact.comments)}` : '',
                `UID:urn:uuid:${contact.id}`,
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

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        return res.status(207).send(xml);
    } catch (e) {
        console.error(e);
        return res.status(500).send('Error');
    }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, pathStr: string) {
    const body = req.body;

    // NOTE: Next.js by default parses body. 
    // We assume string/buffer handling here for vCards.
    let vcard = '';
    if (typeof body === 'string') vcard = body;
    else if (Buffer.isBuffer(body)) vcard = body.toString();
    else vcard = JSON.stringify(body);

    // Simple VCard Parser
    const fnMatch = vcard.match(/FN:(.*)/);
    const emailMatch = vcard.match(/EMAIL.*:(.*)/);
    const telMatch = vcard.match(/TEL.*:(.*)/);
    const orgMatch = vcard.match(/ORG:(.*)/);

    const fullName = fnMatch ? fnMatch[1].trim() : 'Unknown';
    const email = emailMatch ? emailMatch[1].trim() : '';
    const phone = telMatch ? telMatch[1].trim() : '';
    const company = orgMatch ? orgMatch[1].trim().split(';')[0] : '';

    const nameParts = fullName.split(' ');
    const lastName = nameParts.length > 1 ? nameParts.pop() : '';
    const firstName = nameParts.join(' ');

    if (!email && !phone && firstName === 'Unknown') {
        return res.status(400).send('Invalid vCard');
    }

    try {
        const payload: any = {
            first_name: firstName,
            last_name: lastName || '',
            company: company,
            status: 'published',
            updated_at: new Date().toISOString()
        };
        if (email) payload.email = email;
        if (phone) payload.phone = phone;

        let error = null;
        if (email) {
            const { error: err } = await supabase.from('contacts').upsert(payload, { onConflict: 'email' });
            error = err;
        } else {
            const { error: err } = await supabase.from('contacts').insert(payload);
            error = err;
        }

        if (error) console.error('Save error', error);

        const etag = `"${Date.now()}"`;
        res.setHeader('ETag', etag);
        return res.status(201).send('Created');
    } catch (e) {
        console.error('PUT Error', e);
        return res.status(500).send('Error');
    }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, pathStr: string) {
    try {
        // Extract ID from path: /api/dav/addressbooks/user/default/123.vcf
        const match = pathStr.match(/\/(\d+)\.vcf$/);
        if (!match) {
            return res.status(404).send('Not Found');
        }

        const id = match[1];

        // Soft delete rule: "Soft Deletes: Žiadny riadok sa nikdy reálne nemaže. Každá tabuľka má stĺpec deleted_at (timestamp)."
        const { error } = await supabase
            .from('contacts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('DELETE error', error);
            // If record not found or error, return conflict or error? 
            // 404 is technically better if not found, but soft delete 'update' might return success even if 0 rows. 
            // We assume success.
            return res.status(500).send('Error');
        }

        return res.status(204).end();
    } catch (e) {
        console.error('DELETE Error', e);
        return res.status(500).send('Error');
    }
}
