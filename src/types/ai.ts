export interface EmailClassification {
    intent: 'dopyt' | 'otazka' | 'problem' | 'faktura' | 'spam' | 'ine';
    priority: 'vysoka' | 'stredna' | 'nizka';
    sentiment: 'pozitivny' | 'neutralny' | 'negativny';
    service_category: string;
    estimated_budget: string;
    next_step: string;
    draft_reply?: string;
    deadline?: string;
    summary: string;
    entities?: {
        contact_name?: string;
        company_name?: string;
        phone?: string;
        email?: string;
        website?: string;
    };
}


