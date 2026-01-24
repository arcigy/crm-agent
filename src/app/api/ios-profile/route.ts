import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Get the base URL (in dev it's localhost or local IP, in prod it's the domain)
    // We prefer the HOST header to know exactly what the user typed/scanned
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') || host.includes('192') || host.includes('172') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const cardDavUrl = `${baseUrl}/api/dav/addressbooks/user/default`;

    // .mobileconfig XML structure
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>CardDAVAccountDescription</key>
            <string>CRM Contacts</string>
            <key>CardDAVHostName</key>
            <string>${host.split(':')[0]}</string>
            <key>CardDAVPort</key>
            <integer>${host.includes(':') ? parseInt(host.split(':')[1]) : (protocol === 'https' ? 443 : 80)}</integer>
            <key>CardDAVPrincipalURL</key>
            <string>/api/dav/principals/user/</string>
            <key>CardDAVUseSSL</key>
            <${protocol === 'https' ? 'true' : 'false'}/>
            <key>CardDAVUsername</key>
            <string>user@example.com</string>
            <key>CardDAVPassword</key>
            <string>app-specific-password-123</string>
            <key>PayloadDescription</key>
            <string>Configures CardDAV account for CRM Sync</string>
            <key>PayloadDisplayName</key>
            <string>CRM Contacts Sync</string>
            <key>PayloadIdentifier</key>
            <string>com.crm.carddav</string>
            <key>PayloadType</key>
            <string>com.apple.carddav.account</string>
            <key>PayloadUUID</key>
            <string>${crypto.randomUUID()}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>Installs CRM Contacts Sync Account</string>
    <key>PayloadDisplayName</key>
    <string>CRM Mobile Sync</string>
    <key>PayloadIdentifier</key>
    <string>com.crm.profile</string>
    <key>PayloadOrganization</key>
    <string>CRM Inc.</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${crypto.randomUUID()}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/x-apple-aspen-config',
            'Content-Disposition': 'attachment; filename="crm-sync.mobileconfig"'
        }
    });
}
