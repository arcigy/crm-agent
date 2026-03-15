/**
 * Directus Hook Extension pre detailné auditovanie zmien.
 * Tento súbor musí byť skompilovaný a umiestnený v extensions/hooks adresári Directusu.
 */
export default ({ filter, action }: any, { services, database }: any) => {
  const AUDITED_COLLECTIONS = [
    'contacts', 
    'deals', 
    'projects',
    'crm_tasks',
    'google_tokens'
  ];

  // Lokálna cache pre "before" stavy v rámci jedného requestu
  const beforeState = new Map();

  // 1. Zachytiť stav PRED zmenou
  filter('items.update', async (payload: any, { collection, keys }: any) => {
    if (!AUDITED_COLLECTIONS.includes(collection)) return payload;

    for (const key of keys) {
      const item = await database(collection).where({ id: key }).first();
      if (item) {
        beforeState.set(`${collection}:${key}`, item);
      }
    }
    return payload;
  });

  // 2. Zapísať audit log PO zmene
  action('items.update', async ({ payload, keys, collection }: any, { accountability }: any) => {
    if (!AUDITED_COLLECTIONS.includes(collection)) return;

    for (const key of keys) {
      const before = beforeState.get(`${collection}:${key}`);
      const changedFields = Object.keys(payload).filter(
        field => JSON.stringify(before?.[field]) !== JSON.stringify(payload[field])
      );

      if (changedFields.length === 0) continue;

      await database('audit_logs').insert({
        timestamp: new Date().toISOString(),
        user_id: accountability?.user,
        user_email: accountability?.email || 'system',
        action: 'UPDATE',
        collection,
        item_id: String(key),
        old_values: JSON.stringify(
          Object.fromEntries(changedFields.map(f => [f, before?.[f]]))
        ),
        new_values: JSON.stringify(
          Object.fromEntries(changedFields.map(f => [f, payload[f]]))
        ),
        changed_fields: JSON.stringify(changedFields),
        ip_address: accountability?.ip,
        user_agent: accountability?.userAgent
      });
    }
  });

  // 3. Logovanie CREATE
  action('items.create', async ({ payload, key, collection }: any, { accountability }: any) => {
    if (!AUDITED_COLLECTIONS.includes(collection)) return;

    await database('audit_logs').insert({
      timestamp: new Date().toISOString(),
      user_id: accountability?.user,
      user_email: accountability?.email || 'system',
      action: 'CREATE',
      collection,
      item_id: String(key),
      old_values: null,
      new_values: JSON.stringify(payload),
      changed_fields: JSON.stringify(Object.keys(payload)),
      ip_address: accountability?.ip
    });
  });

  // 4. Logovanie DELETE
  action('items.delete', async ({ keys, collection }: any, { accountability }: any) => {
    if (!AUDITED_COLLECTIONS.includes(collection)) return;

    for (const key of keys) {
      await database('audit_logs').insert({
        timestamp: new Date().toISOString(),
        user_id: accountability?.user,
        user_email: accountability?.email || 'system',
        action: 'DELETE',
        collection,
        item_id: String(key)
      });
    }
  });
};
