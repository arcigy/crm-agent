import { createDirectus, rest, staticToken } from '@directus/sdk';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

const directus = createDirectus(DIRECTUS_URL)
    .with(staticToken(process.env.DIRECTUS_TOKEN || ''))
    .with(rest());

export default directus;
