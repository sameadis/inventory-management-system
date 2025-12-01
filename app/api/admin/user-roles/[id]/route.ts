import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  isSystemAdmin,
  getUserBranchId,
} from "@/lib/auth/roles";

/**
 * DELETE /api/admin/user-roles/[id]
 * Remove a role assignment from a user
 * - System admins: can remove any role from any user
 * - Finance users: can remove non-admin roles from users in their branch
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // Get the role assignment details
    const { data: userRole, error: fetchError } = await supabase
      .from("user_roles")
      .select(
        `
        user_id,
        role_id,
        role:roles(name)
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !userRole) {
      return NextResponse.json(
        { error: "Role assignment not found" },
        { status: 404 }
      );
    }

    const role = userRole.role as { name: string } | null;

    // If not system admin, verify permissions
    if (!sysAdmin) {
      // Finance users cannot remove system_admin role
      if (role?.name === "system_admin") {
        return NextResponse.json(
          { error: "Only system admins can remove the system_admin role" },
          { status: 403 }
        );
      }

      // Verify the target user is in the admin's branch
      const userBranchId = await getUserBranchId();
      const { data: targetProfile } = await supabase
        .from("user_profile")
        .select("church_branch_id")
        .eq("id", userRole.user_id)
        .single();

      if (!targetProfile || targetProfile.church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot remove role from user in another branch" },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase.from("user_roles").delete().eq("id", id);

    if (error) {
      console.error("Error removing role:", error);
      return NextResponse.json(
        { error: "Failed to remove role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE /api/admin/user-roles/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

