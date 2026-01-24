export interface AndroidLog {
    id: number;
    type: 'sms' | 'call';
    phone_number: string;
    body?: string;
    duration: number;
    direction: 'incoming' | 'outgoing' | 'missed' | 'rejected';
    timestamp: string;
    extra_data: any;
    contact_id?: number;
}
