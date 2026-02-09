export interface ScrapedPlace {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    url?: string;
    source_city?: string;
    email?: string;
    enrichment_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
}

export interface ScrapeJob {
    id: string;
    search_term: string;
    location: string;
    limit: number;
    status: 'queued' | 'processing' | 'paused' | 'completed' | 'cancelled';
    found_count: number;
    owner_email: string;
    date_created: string;
    current_city_index?: number;
    next_page_token?: string;
    last_error?: string | null;
}
