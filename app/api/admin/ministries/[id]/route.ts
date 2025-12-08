import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  isSystemAdmin,
  getUserBranchId,
} from "@/lib/auth/roles";

/**
 * PATCH /api/admin/ministries/[id]
 * Update a ministry
 * - System admins: can update any ministry
 * - Finance users: can only update ministries in their branch
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { name, contact_info, is_active } = body;

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // If not system admin, verify the ministry is in their branch
    if (!sysAdmin) {
      const userBranchId = await getUserBranchId();
      const { data: ministry } = await supabase
        .from("ministry")
        .select("church_branch_id")
        .eq("id", id)
        .single() as { data: { church_branch_id: string } | null };

      if (!ministry || ministry.church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot update ministry in another branch" },
          { status: 403 }
        );
      }
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (contact_info !== undefined) updates.contact_info = contact_info;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ministry")
      .update(updates as never)
      .eq("id", id)
      .select(
        `
        *,
        church_branch:church_branch(id, name, location, is_active)
      `
      )
      .single();

    if (error) {
      console.error("Error updating ministry:", error);

      // Check for unique constraint violation
      if ("code" in error && error.code === "23505") {
        return NextResponse.json(
          { error: "A ministry with this name already exists in this branch" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update ministry" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Ministry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/admin/ministries/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/admin/ministries/[id]
 * Delete a ministry (not recommended - use is_active = false instead)
 * - System admins: can delete any ministry
 * - Finance users: can only delete ministries in their branch
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

    // If not system admin, verify the ministry is in their branch
    if (!sysAdmin) {
      const userBranchId = await getUserBranchId();
      const { data: ministry } = await supabase
        .from("ministry")
        .select("church_branch_id")
        .eq("id", id)
        .single() as { data: { church_branch_id: string } | null };

      if (!ministry || ministry.church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot delete ministry in another branch" },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase.from("ministry").delete().eq("id", id);

    if (error) {
      console.error("Error deleting ministry:", error);

      // Check for foreign key constraint violation
      if ("code" in error && error.code === "23503") {
        return NextResponse.json(
          {
            error:
              "Cannot delete ministry with existing users or assets. Consider deactivating instead.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to delete ministry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE /api/admin/ministries/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

