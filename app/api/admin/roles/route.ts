import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireSystemAdmin } from "@/lib/auth/roles";

/**
 * GET /api/admin/roles
 * List all roles
 * - Any authenticated admin can view roles
 */
export async function GET() {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/admin/roles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * POST /api/admin/roles
 * Create a new role (future feature)
 * - Only system admins can create roles
 */
export async function POST(request: NextRequest) {
  try {
    await requireSystemAdmin();

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const insertResult = await (supabase.from("roles") as unknown as {
      insert: (values: unknown) => {
        select: () => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
        };
      };
    }).insert({
      name,
      description: description || null,
    }).select().single();
    
    const { data, error } = insertResult;

    if (error) {
      console.error("Error creating role:", error);

      // Check for unique constraint violation
      if ("code" in error && error.code === "23505") {
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 409 }
        );
      }

      // Check for check constraint violation (invalid role name)
      if ("code" in error && error.code === "23514") {
        return NextResponse.json(
          { error: "Invalid role name. Must be one of: finance, ministry_leader, system_admin" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/roles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

