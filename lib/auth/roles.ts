/**
 * Role-based access control utilities
 * Defines role constants and helper functions for checking user roles
 */

import { createClient } from "@/lib/supabase/server";

// Role name constants
export const ROLES = {
  ASSET_MANAGER: "asset_manager",
  MINISTRY_LEADER: "ministry_leader",
  SYSTEM_ADMIN: "system_admin",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/**
 * Get the current user's roles
 */
export async function getUserRoles(): Promise<string[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id) as { data: Array<{ role: unknown }> | null; error: Error | null };

  if (error || !data) {
    return [];
  }

  return data
    .map((ur) => {
      // Handle both array and object responses from Supabase
      const roleData = Array.isArray(ur.role) ? ur.role[0] : ur.role;
      return (roleData as { name: string } | null)?.name;
    })
    .filter((name): name is string => !!name);
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(roleName: RoleName): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(roleName);
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roleNames: RoleName[]): Promise<boolean> {
  const roles = await getUserRoles();
  return roleNames.some((role) => roles.includes(role));
}

/**
 * Check if the current user is a system admin
 */
export async function isSystemAdmin(): Promise<boolean> {
  return hasRole(ROLES.SYSTEM_ADMIN);
}

/**
 * Check if the current user is an asset manager
 */
export async function isAssetManager(): Promise<boolean> {
  return hasRole(ROLES.ASSET_MANAGER);
}

/**
 * Check if the current user is a ministry leader
 */
export async function isMinistryLeader(): Promise<boolean> {
  return hasRole(ROLES.MINISTRY_LEADER);
}

/**
 * Check if the current user has admin privileges (system_admin or asset_manager)
 */
export async function isAdmin(): Promise<boolean> {
  return hasAnyRole([ROLES.SYSTEM_ADMIN, ROLES.ASSET_MANAGER]);
}

/**
 * Get the current user's branch ID
 */
export async function getUserBranchId(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_profile")
    .select("church_branch_id")
    .eq("id", user.id)
    .single() as { data: { church_branch_id: string | null } | null; error: Error | null };

  if (error || !data) {
    return null;
  }

  return data.church_branch_id;
}

/**
 * Get the current user's profile including branch and ministry
 */
export async function getUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_profile")
    .select(
      `
      id,
      full_name,
      church_branch_id,
      ministry_id,
      church_branch:church_branch(id, name, location, is_active),
      ministry:ministry(id, name, is_active)
    `
    )
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Require admin access (system_admin or finance)
 * Throws an error if the user doesn't have admin access
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Require system admin access
 * Throws an error if the user doesn't have system admin access
 */
export async function requireSystemAdmin(): Promise<void> {
  const sysAdmin = await isSystemAdmin();
  if (!sysAdmin) {
    throw new Error("Unauthorized: System admin access required");
  }
}

