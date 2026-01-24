export interface GmailAttachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
}

export interface GmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    subject: string;
    from: string;
    date: string;
    body: string;
    bodyHtml?: string;
    attachments?: GmailAttachment[];
    isRead: boolean;
    labels: string[];
}

export interface GmailInboxResponse {
    messages: GmailMessage[];
    nextPageToken?: string;
    totalMessages?: number;
    isConnected: boolean;
}
