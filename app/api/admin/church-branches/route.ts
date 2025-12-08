import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  requireSystemAdmin,
} from "@/lib/auth/roles";

/**
 * GET /api/admin/church-branches
 * List all church branches
 * - System admins: see all branches
 * - Finance users: see all branches (but can only manage their own)
 */
export async function GET() {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("church_branch")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching branches:", error);
      return NextResponse.json(
        { error: "Failed to fetch branches" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/church-branches:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * POST /api/admin/church-branches
 * Create a new church branch
 * - Only system admins can create branches
 */
export async function POST(request: NextRequest) {
  try {
    await requireSystemAdmin();

    const body = await request.json();
    const { name, location, contact_info, is_active } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const insertResult = await (supabase.from("church_branch") as unknown as {
      insert: (values: unknown) => {
        select: () => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
        };
      };
    }).insert({
      name,
      location: location || null,
      contact_info: contact_info || null,
      is_active: is_active !== undefined ? is_active : true,
    }).select().single();
    
    const { data, error } = insertResult;

    if (error) {
      console.error("Error creating branch:", error);
      
      // Check for unique constraint violation
      if ("code" in error && error.code === "23505") {
        return NextResponse.json(
          { error: "A branch with this name already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create branch" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/church-branches:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

