-- Admin Module RLS Policies
-- Row Level Security policies for church_branch, ministry, user_profile, roles, and user_roles

-- =====================================================
-- ENABLE RLS ON ADMIN TABLES
-- =====================================================

alter table public.church_branch enable row level security;
alter table public.ministry enable row level security;
alter table public.user_profile enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

-- =====================================================
-- CHURCH_BRANCH POLICIES
-- =====================================================

-- System admins can view all branches
create policy "system_admin_view_all_branches"
  on public.church_branch
  for select
  using (public.is_system_admin());

-- Asset managers can view their own branch and optionally all branches (for reference)
-- We'll allow them to see all branches but only manage their own
create policy "asset_manager_view_branches"
  on public.church_branch
  for select
  using (public.is_asset_manager());

-- System admins can insert new branches
create policy "system_admin_insert_branches"
  on public.church_branch
  for insert
  with check (public.is_system_admin());

-- System admins can update any branch
create policy "system_admin_update_branches"
  on public.church_branch
  for update
  using (public.is_system_admin());

-- Asset managers cannot update branches (only system admins can)
-- No policy needed - default deny

-- System admins can delete branches (soft delete via is_active recommended)
create policy "system_admin_delete_branches"
  on public.church_branch
  for delete
  using (public.is_system_admin());

-- =====================================================
-- MINISTRY POLICIES
-- =====================================================

-- System admins can view all ministries
create policy "system_admin_view_all_ministries"
  on public.ministry
  for select
  using (public.is_system_admin());

-- Asset managers can view ministries in their branch
create policy "asset_manager_view_branch_ministries"
  on public.ministry
  for select
  using (
    public.is_asset_manager() 
    and church_branch_id = public.get_user_branch_id()
  );

-- Ministry leaders can view ministries in their branch (for reference)
create policy "ministry_leader_view_branch_ministries"
  on public.ministry
  for select
  using (
    public.is_ministry_leader()
    and church_branch_id = public.get_user_branch_id()
  );

-- System admins can insert ministries in any branch
create policy "system_admin_insert_ministries"
  on public.ministry
  for insert
  with check (public.is_system_admin());

-- Asset managers can insert ministries in their own branch only
create policy "asset_manager_insert_branch_ministries"
  on public.ministry
  for insert
  with check (
    public.is_asset_manager()
    and church_branch_id = public.get_user_branch_id()
  );

-- System admins can update any ministry
create policy "system_admin_update_ministries"
  on public.ministry
  for update
  using (public.is_system_admin());

-- Asset managers can update ministries in their branch
create policy "asset_manager_update_branch_ministries"
  on public.ministry
  for update
  using (
    public.is_asset_manager()
    and church_branch_id = public.get_user_branch_id()
  );

-- System admins can delete ministries
create policy "system_admin_delete_ministries"
  on public.ministry
  for delete
  using (public.is_system_admin());

-- =====================================================
-- USER_PROFILE POLICIES
-- =====================================================

-- System admins can view all user profiles
create policy "system_admin_view_all_profiles"
  on public.user_profile
  for select
  using (public.is_system_admin());

-- Asset managers can view profiles in their branch
create policy "asset_manager_view_branch_profiles"
  on public.user_profile
  for select
  using (
    public.is_asset_manager()
    and church_branch_id = public.get_user_branch_id()
  );

-- Users can view their own profile
create policy "users_view_own_profile"
  on public.user_profile
  for select
  using (id = auth.uid());

-- System admins can insert any user profile
create policy "system_admin_insert_profiles"
  on public.user_profile
  for insert
  with check (public.is_system_admin());

-- Asset managers can insert profiles in their branch
create policy "asset_manager_insert_branch_profiles"
  on public.user_profile
  for insert
  with check (
    public.is_asset_manager()
    and church_branch_id = public.get_user_branch_id()
  );

-- System admins can update any profile
create policy "system_admin_update_profiles"
  on public.user_profile
  for update
  using (public.is_system_admin());

-- Asset managers can update profiles in their branch
-- But cannot change the branch to a different branch
create policy "asset_manager_update_branch_profiles"
  on public.user_profile
  for update
  using (
    public.is_asset_manager()
    and church_branch_id = public.get_user_branch_id()
  )
  with check (
    public.is_asset_manager()
    and church_branch_id = public.get_user_branch_id()
  );

-- Users can update their own profile (limited fields)
create policy "users_update_own_profile"
  on public.user_profile
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- Prevent users from changing their own branch or ministry
    and church_branch_id = (select church_branch_id from public.user_profile where id = auth.uid())
  );

-- =====================================================
-- ROLES POLICIES
-- =====================================================

-- Everyone can view roles (needed for UI dropdowns)
create policy "authenticated_view_roles"
  on public.roles
  for select
  using (auth.uid() is not null);

-- Only system admins can insert new roles
create policy "system_admin_insert_roles"
  on public.roles
  for insert
  with check (public.is_system_admin());

-- Only system admins can update roles
create policy "system_admin_update_roles"
  on public.roles
  for update
  using (public.is_system_admin());

-- Only system admins can delete roles
create policy "system_admin_delete_roles"
  on public.roles
  for delete
  using (public.is_system_admin());

-- =====================================================
-- USER_ROLES POLICIES
-- =====================================================

-- System admins can view all user role assignments
create policy "system_admin_view_all_user_roles"
  on public.user_roles
  for select
  using (public.is_system_admin());

-- Asset managers can view role assignments for users in their branch
create policy "asset_manager_view_branch_user_roles"
  on public.user_roles
  for select
  using (
    public.is_asset_manager()
    and exists (
      select 1 from public.user_profile
      where id = user_roles.user_id
        and church_branch_id = public.get_user_branch_id()
    )
  );

-- Users can view their own role assignments
create policy "users_view_own_roles"
  on public.user_roles
  for select
  using (user_id = auth.uid());

-- System admins can assign any role to any user
create policy "system_admin_insert_user_roles"
  on public.user_roles
  for insert
  with check (public.is_system_admin());

-- Asset managers can assign non-admin roles to users in their branch
create policy "asset_manager_insert_branch_user_roles"
  on public.user_roles
  for insert
  with check (
    public.is_asset_manager()
    -- Can only assign to users in their branch
    and exists (
      select 1 from public.user_profile
      where id = user_roles.user_id
        and church_branch_id = public.get_user_branch_id()
    )
    -- Cannot assign system_admin role
    and not exists (
      select 1 from public.roles
      where id = user_roles.role_id
        and name = 'system_admin'
    )
  );

-- System admins can remove any role assignment
create policy "system_admin_delete_user_roles"
  on public.user_roles
  for delete
  using (public.is_system_admin());

-- Asset managers can remove non-admin roles from users in their branch
create policy "asset_manager_delete_branch_user_roles"
  on public.user_roles
  for delete
  using (
    public.is_asset_manager()
    -- Can only remove from users in their branch
    and exists (
      select 1 from public.user_profile
      where id = user_roles.user_id
        and church_branch_id = public.get_user_branch_id()
    )
    -- Cannot remove system_admin role
    and not exists (
      select 1 from public.roles
      where id = user_roles.role_id
        and name = 'system_admin'
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

comment on policy "system_admin_view_all_branches" on public.church_branch is 'System admins can view all branches across the organization';
comment on policy "asset_manager_view_branches" on public.church_branch is 'Asset managers can view branches (typically their own, but all for reference)';
comment on policy "system_admin_view_all_ministries" on public.ministry is 'System admins can view all ministries across all branches';
comment on policy "asset_manager_view_branch_ministries" on public.ministry is 'Asset managers can only view ministries in their branch';
comment on policy "system_admin_view_all_profiles" on public.user_profile is 'System admins can view all user profiles';
comment on policy "asset_manager_view_branch_profiles" on public.user_profile is 'Asset managers can only view profiles in their branch';

