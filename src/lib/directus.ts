import { createDirectus, staticToken, rest } from '@directus/sdk';

const directus = createDirectus('http://localhost:8055')
    .with(staticToken(process.env.DIRECTUS_TOKEN || ''))
    .with(rest());

export default directus;
