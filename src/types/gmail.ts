import { EmailClassification } from './ai';

export interface GmailAttachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
}

export interface GmailLabel {
    id: string;
    name: string;
    colorBg?: string;
    colorText?: string;
    type?: string;
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
    hasAttachments?: boolean;
    drive_files_count?: number;
    isRead: boolean;
    isStarred?: boolean;
    labels: (string | GmailLabel)[]; // Internal Gmail IDs or full label objects
    googleLabels?: (string | GmailLabel)[]; // Human readable names or full label objects
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
