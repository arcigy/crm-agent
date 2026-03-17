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
    messageIdHeader?: string;
    referencesHeader?: string;
    attachments?: GmailAttachment[];
    isRead: boolean;
    isStarred?: boolean;
    labels: string[]; // Internal Gmail IDs
    googleLabels?: string[]; // Human readable names
    googleLabelColors?: Record<string, string>; // Label names mapped to background colors
    classification?: EmailClassification;
    isAnalyzing?: boolean;
}

export interface GmailInboxResponse {
    messages: GmailMessage[];
    nextPageToken?: string;
    totalMessages?: number;
    isConnected: boolean;
}
