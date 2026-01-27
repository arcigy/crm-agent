import { createDirectus, rest, staticToken } from '@directus/sdk';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-production-fd17.up.railway.app';

const directus = createDirectus(DIRECTUS_URL)
    .with(staticToken(process.env.DIRECTUS_TOKEN || 'fZWEmYZ14ysG16WTfTIFTOBtuxFCumm6'))
    .with(rest());

export default directus;
