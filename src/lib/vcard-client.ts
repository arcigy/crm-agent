
/**
 * Simple Client-Side vCard Parser
 * Parses VCF string into structured contact objects.
 */
export function parseVCard(vcardContent: string): any[] {
    // Normalize newlines
    const content = vcardContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Strip photos aggressively to keep it light
    const cleanContent = content.replace(/PHOTO;[\s\S]*?(?:\n[A-Z]|\n$)/g, '\n');

    // Split into cards
    const rawCards = cleanContent.split('BEGIN:VCARD').filter(c => c.trim().length > 0 && c.includes('END:VCARD'));

    const parsedContacts = rawCards.map(raw => {
        const lines = raw.split('\n');
        let fn = '';
        let n = '';
        let email = '';
        let phone = '';
        let org = '';

        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('FN:') || line.startsWith('FN;')) fn = line.split(':')[1];
            else if (line.startsWith('N:') || line.startsWith('N;')) n = line.split(':')[1];
            else if ((line.startsWith('EMAIL:') || line.startsWith('EMAIL;')) && !email) email = line.split(':')[1];
            else if ((line.startsWith('TEL:') || line.startsWith('TEL;')) && !phone) phone = line.split(':')[1];
            else if ((line.startsWith('ORG:') || line.startsWith('ORG;')) && !org) org = line.split(':')[1];
        }

        const clean = (s: string) => s ? s.trim() : '';
        let fullName = clean(fn);

        if (!fullName && n) {
            const parts = n.split(';');
            const family = parts[0] || '';
            const given = parts[1] || '';
            fullName = (given + ' ' + family).trim();
        }

        const finalEmail = clean(email);
        const finalPhone = clean(phone);
        const finalOrg = clean(org ? org.split(';')[0] : '');

        if (!fullName && !finalEmail && !finalPhone) return null;

        // Return simpler object compatible with bulkCreateContacts format
        return {
            name: fullName || 'Unknown',
            email: finalEmail ? [finalEmail] : [],
            tel: finalPhone ? [finalPhone] : [],
            org: finalOrg
        };
    }).filter(Boolean); // Remove nulls

    return parsedContacts;
}

export function contactsToCSV(contacts: any[]): string {
    const headers = ['Name', 'Email', 'Phone', 'Organization'];
    const rows = contacts.map(c => {
        const name = `"${(c.name || '').replace(/"/g, '""')}"`;
        const email = `"${(c.email?.[0] || '').replace(/"/g, '""')}"`;
        const phone = `"${(c.tel?.[0] || '').replace(/"/g, '""')}"`;
        const org = `"${(c.org || '').replace(/"/g, '""')}"`;
        return [name, email, phone, org].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
}
