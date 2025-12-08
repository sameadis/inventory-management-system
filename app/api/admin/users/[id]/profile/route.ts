import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  isSystemAdmin,
  getUserBranchId,
} from "@/lib/auth/roles";

/**
 * PATCH /api/admin/users/[id]/profile
 * Update a user's profile (branch and ministry assignment)
 * - System admins: can update any user's profile
 * - Finance users: can only update users in their branch, cannot change branch
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { church_branch_id, ministry_id, full_name } = body;

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // Get the current user profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from("user_profile")
      .select("church_branch_id, ministry_id")
      .eq("id", id)
      .single() as { data: { church_branch_id: string; ministry_id: string | null } | null; error: Error | null };

    if (fetchError || !currentProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // If not system admin, verify permissions
    if (!sysAdmin) {
      const userBranchId = await getUserBranchId();

      // User must be in the admin's branch
      if (currentProfile.church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot update user in another branch" },
          { status: 403 }
        );
      }

      // Finance users cannot change the branch
      if (
        church_branch_id !== undefined &&
        church_branch_id !== currentProfile.church_branch_id
      ) {
        return NextResponse.json(
          { error: "Finance users cannot move users to another branch" },
          { status: 403 }
        );
      }
    }

    // Validate that target branch is active (if changing)
    if (
      church_branch_id !== undefined &&
      church_branch_id !== currentProfile.church_branch_id
    ) {
      const { data: branch, error: branchError } = await supabase
        .from("church_branch")
        .select("is_active")
        .eq("id", church_branch_id)
        .single() as { data: { is_active: boolean } | null; error: Error | null };

      if (branchError || !branch) {
        return NextResponse.json(
          { error: "Target branch not found" },
          { status: 404 }
        );
      }

      if (!branch.is_active) {
        return NextResponse.json(
          { error: "Cannot assign user to inactive branch" },
          { status: 400 }
        );
      }
    }

    // Validate that target ministry is active (if changing)
    if (ministry_id !== undefined && ministry_id !== null) {
      const { data: ministry, error: ministryError } = await supabase
        .from("ministry")
        .select("is_active, church_branch_id")
        .eq("id", ministry_id)
        .single() as { data: { is_active: boolean; church_branch_id: string } | null; error: Error | null };

      if (ministryError || !ministry) {
        return NextResponse.json(
          { error: "Target ministry not found" },
          { status: 404 }
        );
      }

      if (!ministry.is_active) {
        return NextResponse.json(
          { error: "Cannot assign user to inactive ministry" },
          { status: 400 }
        );
      }

      // Verify ministry belongs to the target branch
      const targetBranch = church_branch_id || currentProfile.church_branch_id;
      if (ministry.church_branch_id !== targetBranch) {
        return NextResponse.json(
          { error: "Ministry does not belong to the target branch" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (church_branch_id !== undefined) updates.church_branch_id = church_branch_id;
    if (ministry_id !== undefined) updates.ministry_id = ministry_id;
    if (full_name !== undefined) updates.full_name = full_name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_profile")
      .update(updates as never)
      .eq("id", id)
      .select(
        `
        id,
        full_name,
        church_branch_id,
        ministry_id,
        created_at,
        updated_at,
        church_branch:church_branch(id, name, location, is_active),
        ministry:ministry(id, name, is_active)
      `
      )
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[id]/profile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

