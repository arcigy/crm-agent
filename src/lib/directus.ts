import { createDirectus, rest, staticToken } from '@directus/sdk';

// Use private network URL for server-side, public URL for client-side
const DIRECTUS_URL = typeof window === 'undefined'
    ? (process.env.DIRECTUS_URL || 'http://directus-buk1.railway.internal:8055')
    : (process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-buk1-production.up.railway.app');

const directus = createDirectus(DIRECTUS_URL)
    .with(staticToken(process.env.DIRECTUS_TOKEN || '3cSXW-vP-3ujjyXvS0-htoPcsSQOZ5GE'))
    .with(rest());

export default directus;
