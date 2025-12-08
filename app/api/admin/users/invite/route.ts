import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, isSystemAdmin, getUserBranchId } from "@/lib/auth/roles";

/**
 * POST /api/admin/users/invite
 * Invite a new user and create their profile
 * - System admins: can invite to any branch
 * - Asset managers: can only invite to their own branch
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { email, full_name, church_branch_id, ministry_id, role_ids } = body;

    if (!email || !church_branch_id) {
      return NextResponse.json(
        { error: "Email and branch are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const sysAdmin = await isSystemAdmin();

    // If not system admin, verify they're inviting to their own branch
    if (!sysAdmin) {
      const userBranchId = await getUserBranchId();
      if (church_branch_id !== userBranchId) {
        return NextResponse.json(
          { error: "Cannot invite users to another branch" },
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
        { error: "Cannot invite user to inactive branch" },
        { status: 400 }
      );
    }

    // If ministry is specified, verify it exists and is active
    if (ministry_id) {
      const { data: ministry, error: ministryError } = await supabase
        .from("ministry")
        .select("is_active, church_branch_id")
        .eq("id", ministry_id)
        .single() as { data: { is_active: boolean; church_branch_id: string } | null; error: Error | null };

      if (ministryError || !ministry) {
        return NextResponse.json(
          { error: "Ministry not found" },
          { status: 404 }
        );
      }

      if (!ministry.is_active) {
        return NextResponse.json(
          { error: "Cannot assign user to inactive ministry" },
          { status: 400 }
        );
      }

      if (ministry.church_branch_id !== church_branch_id) {
        return NextResponse.json(
          { error: "Ministry does not belong to the selected branch" },
          { status: 400 }
        );
      }
    }

    // Invite the user via Supabase Auth using admin client
    const adminClient = createAdminClient();
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: full_name || email,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      });

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      return NextResponse.json(
        { error: inviteError.message || "Failed to invite user" },
        { status: 400 }
      );
    }

    if (!inviteData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await (supabase.from("user_profile") as unknown as {
      insert: (values: unknown) => Promise<{ error: Error | null }>;
    }).insert({
      id: inviteData.user.id,
      full_name: full_name || email,
      church_branch_id,
      ministry_id: ministry_id || null,
    });

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      // User was invited but profile creation failed
      // The trigger should have created it, but let's log the error
      return NextResponse.json(
        {
          warning:
            "User invited but profile creation had an issue. The trigger should handle it.",
          user: inviteData.user,
        },
        { status: 201 }
      );
    }

    // Assign roles if specified
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const currentUser = await supabase.auth.getUser();

      // Verify permissions for each role
      for (const role_id of role_ids) {
        // Get role name
        const { data: role } = await supabase
          .from("roles")
          .select("name")
          .eq("id", role_id)
          .single() as { data: { name: string } | null; error: Error | null };

        // Asset managers cannot assign system_admin role
        if (!sysAdmin && role?.name === "system_admin") {
          continue; // Skip this role
        }

        // Assign the role
        await (supabase.from("user_roles") as unknown as {
          insert: (values: unknown) => Promise<{ error: Error | null }>;
        }).insert({
          user_id: inviteData.user.id,
          role_id,
          assigned_by: currentUser.data.user?.id || null,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: inviteData.user.id,
          email: inviteData.user.email,
        },
        message: "User invited successfully. They will receive an email to set their password.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/admin/users/invite:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

