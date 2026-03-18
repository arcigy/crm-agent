import { db } from './db';

export interface OrgRole {
  name: string;
  level: number;
  permissions: Record<string, any>;
}

export interface OrgMember {
  id: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  branchId: string | null;
  role: OrgRole;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

// Get current member's organization
export async function getMemberOrganization(
  clerkUserId: string
): Promise<{ 
  member: OrgMember | null, 
  organization: Organization | null 
}> {
  const result = await db.query(`
    SELECT 
      m.*,
      o.id as org_id,
      o.name as org_name,
      o.slug as org_slug,
      r.name as role_name,
      r.level as role_level,
      r.permissions as role_permissions
    FROM org_members m
    JOIN organizations o ON o.id = m.organization_id
    LEFT JOIN org_roles r ON r.id = m.role_id
    WHERE m.clerk_user_id = $1
    AND m.status = 'active'
    LIMIT 1
  `, [clerkUserId]);

  if (!result.rows.length) return { member: null, organization: null };
  
  const row = result.rows[0];
  return {
    member: {
      id: row.id,
      clerkUserId: row.clerk_user_id,
      email: row.email,
      name: row.name,
      branchId: row.branch_id,
      role: {
        name: row.role_name,
        level: row.role_level,
        permissions: row.role_permissions
      }
    },
    organization: {
      id: row.org_id,
      name: row.org_name,
      slug: row.org_slug
    }
  };
}

// Check if user has permission
export function hasPermission(
  member: OrgMember,
  resource: string,
  action: string
): boolean {
  const perm = member.role.permissions?.[resource]?.[action];
  return perm !== false && perm !== undefined && perm !== null;
}
