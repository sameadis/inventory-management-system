import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/lib/auth/roles";

/**
 * PATCH /api/admin/church-branches/[id]
 * Update a church branch
 * - Only system admins can update branches
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin();

    const { id } = await params;
    const body = await request.json();
    const { name, location, contact_info, is_active } = body;

    const supabase = await createClient();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (contact_info !== undefined) updates.contact_info = contact_info;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("church_branch")
      .update(updates as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating branch:", error);

      // Check for unique constraint violation
      if ("code" in error && error.code === "23505") {
        return NextResponse.json(
          { error: "A branch with this name already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update branch" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/admin/church-branches/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/admin/church-branches/[id]
 * Delete a church branch (not recommended - use is_active = false instead)
 * - Only system admins can delete branches
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSystemAdmin();

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("church_branch")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting branch:", error);

      // Check for foreign key constraint violation
      if ("code" in error && error.code === "23503") {
        return NextResponse.json(
          {
            error:
              "Cannot delete branch with existing users, ministries, or assets. Consider deactivating instead.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to delete branch" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE /api/admin/church-branches/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

