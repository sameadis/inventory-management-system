import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  isSystemAdmin,
  getUserBranchId,
} from "@/lib/auth/roles";

/**
 * POST /api/admin/user-roles
 * Assign a role to a user
 * - System admins: can assign any role to any user
 * - Finance users: can assign non-admin roles to users in their branch
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { user_id, role_id } = body;

    if (!user_id || !role_id) {
      return NextResponse.json(
        { error: "user_id and role_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // Get the role being assigned
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .eq("id", role_id)
      .single() as { data: { name: string } | null; error: Error | null };

    if (roleError || !role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // If not system admin, verify permissions
    if (!sysAdmin) {
      // Finance users cannot assign system_admin role
      if (role.name === "system_admin") {
        return NextResponse.json(
          { error: "Only system admins can assign the system_admin role" },
          { status: 403 }
        );
      }

      // Verify the target user is in the admin's branch
      const userBranchId = await getUserBranchId();
      const { data: targetProfile } = await supabase
        .from("user_profile")
        .select("church_branch_id")
        .eq("id", user_id)
        .single() as { data: { church_branch_id: string } | null; error: Error | null };

      if (!targetProfile || targetProfile.church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot assign role to user in another branch" },
          { status: 403 }
        );
      }
    }

    // Get current user for assigned_by
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const insertResult = await (supabase.from("user_roles") as unknown as {
      insert: (values: unknown) => {
        select: (columns: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
        };
      };
    }).insert({
      user_id,
      role_id,
      assigned_by: user?.id || null,
    }).select(`
      id,
      user_id,
      role_id,
      assigned_at,
      assigned_by,
      role:roles(id, name, description)
    `).single();
    
    const { data, error } = insertResult;

    if (error) {
      console.error("Error assigning role:", error);

      // Check for unique constraint violation
      if ("code" in error && error.code === "23505") {
        return NextResponse.json(
          { error: "User already has this role" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to assign role" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/user-roles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

