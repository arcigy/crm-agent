import { NextResponse } from 'next/server';
import { getGmailClient, refreshAccessToken } from '@/lib/google';
import { createClient } from '@/lib/supabase-server';
import { classifyEmail } from '@/app/actions/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Získame tokeny z DB
        const { data: tokenData, error: tokenError } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Not connected', isConnected: false }, { status: 200 });
        }

        // Vytvoríme Gmail klienta
        let accessToken = tokenData.access_token;
        const expiryDate = tokenData.expiry_date;

        // Ak je token expirovaný, refreshneme ho
        if (expiryDate && expiryDate < Date.now() && tokenData.refresh_token) {
            const newTokens = await refreshAccessToken(tokenData.refresh_token);
            accessToken = newTokens.access_token!;

            // Update v DB
            await supabase.from('google_tokens').update({
                access_token: accessToken,
                expiry_date: newTokens.expiry_date,
                updated_at: new Date().toISOString()
            }).eq('user_id', user.id);
        }

        const gmail = getGmailClient(accessToken, tokenData.refresh_token);

        // Získame zoznam posledných správ (napr. 20 správ)
        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20,
            q: 'label:INBOX'
        });

        const messages = listResponse.data.messages || [];

        // --- 1. Fetch Existing AI Classifications from DB ---
        const messageIds = messages.map(m => m.id!);
        let classificationsMap = new Map();

        if (messageIds.length > 0) {
            const { data } = await supabase
                .from('email_analysis')
                .select('*')
                .select('*')
                .in('message_id', messageIds);

            console.log(`[Gmail] DB Lookup for ${messageIds.length} msgs found ${data?.length || 0} classifications.`);

            data?.forEach(c => classificationsMap.set(c.message_id, c));
        }
        // -------------------------------------------

        const fullMessages = await Promise.all(
            messages.map(async (msg) => {
                const details = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: 'full'
                });

                const payload = details.data.payload;
                const headers = payload?.headers || [];

                const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender';
                const date = headers.find(h => h.name === 'Date')?.value || '';

                const decodeGmailData = (data: string) => {
                    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
                };

                // Body extraction
                let bodyPlain = '';
                let bodyHtml = '';
                const attachments: any[] = [];

                const processParts = (parts: any[]) => {
                    for (const part of parts) {
                        if (part.mimeType === 'text/plain' && part.body?.data) {
                            bodyPlain = decodeGmailData(part.body.data);
                        } else if (part.mimeType === 'text/html' && part.body?.data) {
                            bodyHtml = decodeGmailData(part.body.data);
                        } else if (part.filename && part.body?.attachmentId) {
                            attachments.push({
                                id: part.body.attachmentId,
                                filename: part.filename,
                                mimeType: part.mimeType,
                                size: part.body.size
                            });
                        }
                        if (part.parts) processParts(part.parts);
                    }
                };

                if (payload?.parts) {
                    processParts(payload.parts);
                } else if (payload?.body?.data) {
                    bodyPlain = decodeGmailData(payload.body.data);
                    if (payload.mimeType === 'text/html') {
                        bodyHtml = bodyPlain;
                        bodyPlain = bodyPlain.replace(/<[^>]*>?/gm, '');
                    }
                }

                const isUnread = details.data.labelIds?.includes('UNREAD');

                // --- AUTO ANALYZE LOGIC ---
                // FIX: Only analyze NEW (Unread) emails automatically to save tokens and avoid analyzing history
                let classification = classificationsMap.get(details.data.id);

                if (!classification && bodyPlain.length > 0 && isUnread) {
                    // 1. Strict Filter (Spam check locally)
                    const lowerContent = bodyPlain.toLowerCase();
                    const spamKeywords = [
                        'unsubscribe', 'odhlásiť sa', 'reklama', 'marketing',
                        'prijímanie správ', 'odobrať z odberu', 'zobraziť v prehliadači',
                        'view in browser', 'click here to unsubscribe'
                    ];
                    const isHeuristicSpam = spamKeywords.some(word => lowerContent.includes(word));

                    if (isHeuristicSpam) {
                        classification = {
                            intent: 'spam',
                            priority: 'nizka',
                            sentiment: 'neutralny',
                            service_category: '—',
                            estimated_budget: '—',
                            next_step: '—',
                            summary: 'Heuristický filter: Newsletter/Marketing',
                            deadline: null
                        };
                    } else if (bodyPlain.length > 10) {
                        try {
                            classification = await classifyEmail(bodyPlain.substring(0, 1500));
                        } catch (e) {
                            console.error('Auto-analysis failed for:', msg.id, e);
                        }
                    }

                    // 3. Save to DB (Upsert)
                    if (classification) {
                        try {
                            await supabase.from('email_analysis').upsert([{
                                message_id: details.data.id,
                                ...classification,
                                updated_at: new Date().toISOString()
                            }], { onConflict: 'message_id' });
                        } catch (err) {
                            console.error('Auto-analysis Save Error:', err);
                        }
                    }
                }
                // --------------------------

                return {
                    id: details.data.id,
                    threadId: details.data.threadId,
                    snippet: details.data.snippet,
                    subject,
                    from,
                    date,
                    body: bodyPlain || details.data.snippet || '',
                    bodyHtml: bodyHtml || '',
                    attachments: attachments,
                    isRead: !isUnread,
                    labels: details.data.labelIds || [],
                    classification // Attached!
                };
            })
        );

        return NextResponse.json({ messages: fullMessages, isConnected: true });
    } catch (error) {
        console.error('Fetch gmail error:', error);
        return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { messageId } = await request.json();
        if (!messageId) return NextResponse.json({ error: 'Message ID required' }, { status: 400 });

        const { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokenData) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

        const gmail = getGmailClient(tokenData.access_token, tokenData.refresh_token);

        // Mark as read by removing UNREAD label
        // Mark as read by removing UNREAD label
        await gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: {
                ids: [messageId],
                removeLabelIds: ['UNREAD']
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update gmail error:', error);
        return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { messageId, attachmentId, filename } = await request.json();
        if (!messageId || !attachmentId) {
            return NextResponse.json({ error: 'Message ID and Attachment ID required' }, { status: 400 });
        }

        const { data: tokenData } = await supabase
            .from('google_tokens')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!tokenData) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

        const gmail = getGmailClient(tokenData.access_token, tokenData.refresh_token);

        const response = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId,
            id: attachmentId
        });

        const data = response.data.data;
        if (!data) throw new Error('Attachment data not found');

        // Convert base64url to base64
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(base64, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename || 'attachment')}"`,
            },
        });
    } catch (error) {
        console.error('Download attachment error:', error);
        return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
    }
}
