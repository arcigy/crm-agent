import { EmailClassification } from './ai';

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
    to?: string;
    date: string;
    body: string;
    bodyHtml?: string;
    attachments?: GmailAttachment[];
    isRead: boolean;
    isStarred?: boolean;
    labels: string[]; // Internal Gmail IDs
    googleLabels?: string[]; // Human readable names
    classification?: EmailClassification;
    isAnalyzing?: boolean;
}

export interface GmailInboxResponse {
    messages: GmailMessage[];
    nextPageToken?: string;
    totalMessages?: number;
    isConnected: boolean;
}
