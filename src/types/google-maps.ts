export interface ScrapedPlace {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    url?: string;
    source_city?: string;
}

export interface ScrapeJob {
    id: string;
    date: string;
    keyword: string;
    location: string;
    foundCount: number;
    cost: number;
    status: 'completed' | 'failed' | 'stopped';
}
