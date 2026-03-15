import { createDirectus, rest, staticToken, createCollection, createField } from '@directus/sdk';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Vytvorí kolekciu audit_logs v Directuse pre detailné sledovanie zmien.
 */
async function setupAuditCollection() {
  const url = process.env.DIRECTUS_URL?.includes('.internal') 
    ? process.env.NEXT_PUBLIC_DIRECTUS_URL 
    : (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL);

  if (!url) {
    console.error('DIRECTUS_URL or NEXT_PUBLIC_DIRECTUS_URL is missing.');
    process.exit(1);
  }

  const token = process.env.DIRECTUS_TOKEN;

  if (!token) {
    console.error('DIRECTUS_TOKEN is missing.');
    process.exit(1);
  }

  const client = createDirectus(url)
    .with(staticToken(token))
    .with(rest());

  console.log('[Setup] Creating audit_logs collection...');

  try {
    // 1. Vytvoriť kolekciu
    await client.request(createCollection({
      collection: 'audit_logs',
      meta: {
        note: 'Detailné auditné logy pre citlivé operácie.',
        display_template: '{{action}} on {{collection}} by {{user_email}}',
        icon: 'security',
      },
      schema: {}
    }));
    console.log('[Setup] Collection audit_logs created.');

    // 2. Vytvoriť polia
    const fields = [
      { field: 'timestamp', type: 'timestamp', meta: { interface: 'datetime', width: 'half' }, schema: { default_value: 'now()' } },
      { field: 'user_id', type: 'uuid', meta: { interface: 'user', width: 'half' } },
      { field: 'user_email', type: 'string', meta: { interface: 'input', width: 'half' } },
      { field: 'action', type: 'string', meta: { interface: 'input', width: 'half' } },
      { field: 'collection', type: 'string', meta: { interface: 'input', width: 'half' } },
      { field: 'item_id', type: 'string', meta: { interface: 'input', width: 'half' } },
      { field: 'old_values', type: 'json', meta: { interface: 'json', width: 'full' } },
      { field: 'new_values', type: 'json', meta: { interface: 'json', width: 'full' } },
      { field: 'changed_fields', type: 'json', meta: { interface: 'tags', width: 'full' } },
      { field: 'ip_address', type: 'string', meta: { interface: 'input', width: 'half' } },
      { field: 'user_agent', type: 'string', meta: { interface: 'input', width: 'half' } },
    ];

    for (const f of fields) {
      try {
        await client.request(createField('audit_logs', {
          field: f.field,
          type: f.type,
          meta: f.meta as any,
          schema: f.schema as any || {}
        }));
        console.log(`[Setup] Field ${f.field} created.`);
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log(`[Setup] Field ${f.field} already exists.`);
        } else {
          throw err;
        }
      }
    }

    // 3. Vytvoriť archívnu tabuľku (identická)
    console.log('[Setup] Creating audit_logs_archive...');
    await client.request(createCollection({
      collection: 'audit_logs_archive',
      meta: {
        note: 'Archivované logy staršie ako 90 dní.',
        icon: 'archive',
      },
      schema: {}
    }));

    for (const f of fields) {
      await client.request(createField('audit_logs_archive', {
        field: f.field,
        type: f.type,
        meta: f.meta as any,
        schema: f.schema as any || {}
      }));
    }
    console.log('[Setup] Collection audit_logs_archive created.');

    console.log('✅ Audit logging setup complete.');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('⚠️ Collection audit_logs already exists.');
    } else {
      console.error('❌ Setup failed:', err);
    }
  }
}

setupAuditCollection();
