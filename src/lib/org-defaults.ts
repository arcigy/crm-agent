export const DEFAULT_ROLES = [
  {
    name: 'Riaditeľ',
    level: 1,
    permissions: {
      contacts: { read: 'organization', write: 'organization', delete: 'organization', toggle_visibility: true },
      deals: { read: 'organization', write: 'organization', delete: 'organization' },
      invoices: { read: 'organization', write: 'organization', delete: false },
      automations: { view_usage: 'organization', allowed: 'all' },
      reports: { scope: 'organization' },
      members: { invite: true, manage_roles: true, view_activity: 'organization' },
      emails: { read: 'own' } // NEVER 'all' — privacy
    }
  },
  {
    name: 'Manažér',
    level: 2,
    permissions: {
      contacts: { read: 'branch', write: 'branch', delete: 'own', toggle_visibility: true },
      deals: { read: 'branch', write: 'branch', delete: 'own' },
      invoices: { read: 'branch', write: false, delete: false },
      automations: { view_usage: 'branch', allowed: 'all' },
      reports: { scope: 'branch' },
      members: { invite: true, manage_roles: false, view_activity: 'branch' },
      emails: { read: 'own' } // NEVER shared
    }
  },
  {
    name: 'Realitný maklér',
    level: 3,
    permissions: {
      contacts: { read: 'own', write: 'own', delete: 'own', toggle_visibility: true },
      deals: { read: 'own', write: 'own', delete: false },
      invoices: { read: 'own', write: false, delete: false },
      automations: { view_usage: false, allowed: [] },
      reports: { scope: 'own' },
      members: { invite: false, manage_roles: false, view_activity: false },
      emails: { read: 'own' }
    }
  },
  {
    name: 'Účtovník',
    level: 4,
    permissions: {
      contacts: { read: false, write: false, delete: false },
      deals: { read: 'organization', write: false, delete: false },
      invoices: { read: 'organization', write: 'organization', delete: false },
      automations: { view_usage: false, allowed: [] },
      reports: { scope: 'organization' },
      members: { invite: false, manage_roles: false, view_activity: false },
      emails: { read: 'own' }
    }
  },
  {
    name: 'Asistent',
    level: 5,
    permissions: {
      contacts: { read: 'branch', write: 'own', delete: false, toggle_visibility: true },
      deals: { read: 'branch', write: false, delete: false },
      invoices: { read: false, write: false, delete: false },
      automations: { view_usage: false, allowed: [] },
      reports: { scope: false },
      members: { invite: false, manage_roles: false, view_activity: false },
      emails: { read: 'own' }
    }
  },
  {
    name: 'Externý partner',
    level: 6,
    permissions: {
      contacts: { read: false, write: false, delete: false },
      deals: { read: 'own', write: false, delete: false },
      invoices: { read: false, write: false, delete: false },
      automations: { view_usage: false, allowed: [] },
      reports: { scope: false },
      members: { invite: false, manage_roles: false, view_activity: false },
      emails: { read: 'own' }
    }
  }
];

export async function seedDefaultRoles(
  organizationId: string,
  db: any
): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    await db.query(`
      INSERT INTO org_roles 
        (organization_id, name, level, is_system, permissions)
      VALUES ($1, $2, $3, true, $4)
      ON CONFLICT DO NOTHING
    `, [organizationId, role.name, role.level, 
        JSON.stringify(role.permissions)]);
  }
}
