import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  isSystemAdmin,
  getUserBranchId,
} from "@/lib/auth/roles";

/**
 * GET /api/admin/ministries
 * List ministries, optionally filtered by branch
 * - System admins: see all ministries
 * - Finance users: see ministries in their branch only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const church_branch_id = searchParams.get("church_branch_id");

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    let query = supabase
      .from("ministry")
      .select(
        `
        *,
        church_branch:church_branch(id, name, location, is_active)
      `
      )
      .order("name");

    // If not system admin, filter to user's branch
    if (!sysAdmin) {
      const userBranchId = await getUserBranchId();
      if (!userBranchId) {
        return NextResponse.json(
          { error: "User branch not found" },
          { status: 403 }
        );
      }
      query = query.eq("church_branch_id", userBranchId);
    } else if (church_branch_id) {
      // System admin can filter by branch if specified
      query = query.eq("church_branch_id", church_branch_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching ministries:", error);
      return NextResponse.json(
        { error: "Failed to fetch ministries" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/ministries:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * POST /api/admin/ministries
 * Create a new ministry
 * - System admins: can create in any branch
 * - Finance users: can only create in their own branch
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, church_branch_id, contact_info, is_active } = body;

    if (!name || !church_branch_id) {
      return NextResponse.json(
        { error: "Ministry name and branch are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // If not system admin, verify they're creating in their own branch
    if (!sysAdmin) {
      const userBranchId = await getUserBranchId();
      if (church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot create ministry in another branch" },
          { status: 403 }
        );
      }
    }

    // Verify the branch exists and is active
    const { data: branch, error: branchError } = await supabase
      .from("church_branch")
      .select("is_active")
      .eq("id", church_branch_id)
      .single() as { data: { is_active: boolean } | null; error: Error | null };

    if (branchError || !branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    if (!branch.is_active) {
      return NextResponse.json(
        { error: "Cannot create ministry in inactive branch" },
        { status: 400 }
      );
    }

    const insertResult = await (supabase.from("ministry") as unknown as {
      insert: (values: unknown) => {
        select: (columns: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
        };
      };
    }).insert({
      name,
      church_branch_id,
      contact_info: contact_info || null,
      is_active: is_active !== undefined ? is_active : true,
    }).select(`
      *,
      church_branch:church_branch(id, name, location, is_active)
    `).single();
    
    const { data, error } = insertResult;

    if (error) {
      console.error("Error creating ministry:", error);

      // Check for unique constraint violation
      if ("code" in error && error.code === "23505") {
        return NextResponse.json(
          { error: "A ministry with this name already exists in this branch" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create ministry" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/ministries:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

