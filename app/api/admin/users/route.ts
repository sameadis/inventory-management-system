import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireAdmin,
  isSystemAdmin,
  getUserBranchId,
} from "@/lib/auth/roles";

/**
 * GET /api/admin/users
 * List users with their profiles, branches, ministries, and roles
 * - System admins: see all users
 * - Finance users: see users in their branch only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const church_branch_id = searchParams.get("church_branch_id");

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // Build the query for user profiles with related data
    let query = supabase
      .from("user_profile")
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
      .order("full_name");

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

    const { data: profiles, error: profilesError } = await query as { 
      data: Array<{ 
        id: string; 
        full_name: string; 
        church_branch_id: string; 
        ministry_id: string | null;
        created_at: string;
        updated_at: string;
      }> | null; 
      error: Error | null 
    };

    if (profilesError || !profiles) {
      console.error("Error fetching user profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get user emails from auth.users
    const userIds = profiles.map((p) => p.id);
    
    // Fetch user roles for each user
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select(
        `
        user_id,
        role:roles(id, name, description)
      `
      )
      .in("user_id", userIds) as { 
        data: Array<{ user_id: string; role: unknown }> | null; 
        error: Error | null 
      };

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return NextResponse.json(
        { error: "Failed to fetch user roles" },
        { status: 500 }
      );
    }

    // Get emails using database function (doesn't require service role key)
    const { data: emailData, error: emailError } = await (supabase.rpc as unknown as (
      fn: string, 
      params: { user_ids: string[] }
    ) => Promise<{ data: Array<{ user_id: string; email: string }> | null; error: Error | null }>)(
      'get_user_emails',
      { user_ids: userIds }
    );

    if (emailError) {
      console.error("Error fetching user emails:", emailError);
    }

    // Create email map
    const emailMap = new Map<string, string>();
    if (emailData) {
      emailData.forEach((row: { user_id: string; email: string }) => {
        emailMap.set(row.user_id, row.email);
      });
    }

    // Combine the data
    const usersWithRoles = profiles.map((profile) => {
      const userRolesList = userRoles?.filter((ur) => ur.user_id === profile.id) || [];
      
      const roles = userRolesList
        .map((ur) => {
          // Handle both array and object responses from Supabase
          const roleData = Array.isArray(ur.role) ? ur.role[0] : ur.role;
          return roleData as { id: string; name: string; description: string | null } | null;
        })
        .filter((r): r is { id: string; name: string; description: string | null } => r !== null);

      return {
        ...profile,
        email: emailMap.get(profile.id) || null,
        roles,
      };
    });

    return NextResponse.json(usersWithRoles);
  } catch (error) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

