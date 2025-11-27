-- ALIC Fixed Asset Inventory Management System
-- Row Level Security (RLS) Policies
--
-- Security Model:
-- 1. Branch Scoping: Users can only access data from their church_branch_id
-- 2. Role-Based Access:
--    - finance: Full CRUD on assets, approve transfers/disposals
--    - ministry_leader: Create verification/transfer/disposal requests
--    - system_admin: Full access across all branches
-- 3. All authenticated users can view reference data (branches, ministries, roles)

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's church branch ID
create or replace function public.get_user_branch_id()
returns uuid as $$
  select church_branch_id 
  from public.user_profile 
  where id = auth.uid();
$$ language sql stable security definer;

-- Check if user has a specific role
create or replace function public.user_has_role(role_name text)
returns boolean as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
    and r.name = role_name
  );
$$ language sql stable security definer;

-- Check if user is system admin
create or replace function public.is_system_admin()
returns boolean as $$
  select public.user_has_role('system_admin');
$$ language sql stable security definer;

-- Check if user is asset manager
create or replace function public.is_asset_manager()
returns boolean as $$
  select public.user_has_role('asset_manager');
$$ language sql stable security definer;

-- Check if user is ministry leader
create or replace function public.is_ministry_leader()
returns boolean as $$
  select public.user_has_role('ministry_leader');
$$ language sql stable security definer;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

-- Public schema
alter table public.church_branch enable row level security;
alter table public.ministry enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_profile enable row level security;

-- Inventory schema
alter table inventory.asset enable row level security;
alter table inventory.verification_history enable row level security;
alter table inventory.transfer_history enable row level security;
alter table inventory.disposal_history enable row level security;

-- =====================================================
-- PUBLIC SCHEMA POLICIES
-- =====================================================

-- CHURCH_BRANCH policies
-- System admins see all branches, others see only their branch
create policy "Users can view their own branch or all if system admin"
  on public.church_branch for select
  using (
    public.is_system_admin() 
    or id = public.get_user_branch_id()
  );

create policy "Only system admins can create branches"
  on public.church_branch for insert
  with check (public.is_system_admin());

create policy "Only system admins can update branches"
  on public.church_branch for update
  using (public.is_system_admin())
  with check (public.is_system_admin());

create policy "Only system admins can delete branches"
  on public.church_branch for delete
  using (public.is_system_admin());

-- MINISTRY policies
-- Users can view ministries in their branch
create policy "Users can view ministries in their branch"
  on public.ministry for select
  using (
    public.is_system_admin()
    or church_branch_id = public.get_user_branch_id()
  );

create policy "Asset managers and system admins can create ministries"
  on public.ministry for insert
  with check (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  );

create policy "Asset managers and system admins can update ministries"
  on public.ministry for update
  using (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  )
  with check (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  );

create policy "Only system admins can delete ministries"
  on public.ministry for delete
  using (public.is_system_admin());

-- ROLES policies
-- All authenticated users can view roles
create policy "All authenticated users can view roles"
  on public.roles for select
  using (auth.uid() is not null);

create policy "Only system admins can manage roles"
  on public.roles for all
  using (public.is_system_admin())
  with check (public.is_system_admin());

-- USER_ROLES policies
-- Users can view their own roles, admins see all in their branch
create policy "Users can view their own roles"
  on public.user_roles for select
  using (
    public.is_system_admin()
    or user_id = auth.uid()
  );

create policy "System admins can assign roles"
  on public.user_roles for insert
  with check (public.is_system_admin());

create policy "System admins can remove role assignments"
  on public.user_roles for delete
  using (public.is_system_admin());

-- USER_PROFILE policies
-- Users can view profiles in their branch
create policy "Users can view profiles in their branch"
  on public.user_profile for select
  using (
    public.is_system_admin()
    or church_branch_id = public.get_user_branch_id()
  );

create policy "Users can view their own profile"
  on public.user_profile for select
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.user_profile for update
  using (id = auth.uid())
  with check (
    id = auth.uid() 
    and church_branch_id = public.get_user_branch_id()
  );

create policy "System admins can create user profiles"
  on public.user_profile for insert
  with check (public.is_system_admin());

create policy "System admins can delete user profiles"
  on public.user_profile for delete
  using (public.is_system_admin());

-- =====================================================
-- INVENTORY SCHEMA POLICIES
-- =====================================================

-- ASSET policies
-- All users can view assets in their branch
create policy "Users can view assets in their branch"
  on inventory.asset for select
  using (
    public.is_system_admin()
    or church_branch_id = public.get_user_branch_id()
  );

-- Only Asset Managers can create assets
create policy "Asset managers can create assets in their branch"
  on inventory.asset for insert
  with check (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  );

-- Only Asset Managers can update assets
create policy "Asset managers can update assets in their branch"
  on inventory.asset for update
  using (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  )
  with check (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  );

-- Only Asset Managers can delete assets (soft delete via status recommended)
create policy "Asset managers can delete assets in their branch"
  on inventory.asset for delete
  using (
    public.is_system_admin()
    or (public.is_asset_manager() and church_branch_id = public.get_user_branch_id())
  );

-- VERIFICATION_HISTORY policies
-- Users can view verification history for assets in their branch
create policy "Users can view verification history in their branch"
  on inventory.verification_history for select
  using (
    public.is_system_admin()
    or exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    )
  );

-- Asset Managers and Ministry Leaders can create verification records
create policy "Asset managers and Ministry Leaders can create verifications"
  on inventory.verification_history for insert
  with check (
    public.is_system_admin()
    or public.is_asset_manager()
    or public.is_ministry_leader()
  );

-- TRANSFER_HISTORY policies
-- Users can view transfer history for assets in their branch
create policy "Users can view transfer history in their branch"
  on inventory.transfer_history for select
  using (
    public.is_system_admin()
    or exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    )
  );

-- Asset Managers and Ministry Leaders can create transfer requests
create policy "Asset managers and Ministry Leaders can request transfers"
  on inventory.transfer_history for insert
  with check (
    public.is_system_admin()
    or public.is_asset_manager()
    or public.is_ministry_leader()
  );

-- Only Asset Managers can approve transfers (update approved_by and transfer_date)
create policy "Asset managers can approve transfers"
  on inventory.transfer_history for update
  using (
    public.is_system_admin()
    or (public.is_asset_manager() and exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    ))
  )
  with check (
    public.is_system_admin()
    or (public.is_asset_manager() and exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    ))
  );

-- DISPOSAL_HISTORY policies
-- Users can view disposal history for assets in their branch
create policy "Users can view disposal history in their branch"
  on inventory.disposal_history for select
  using (
    public.is_system_admin()
    or exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    )
  );

-- Asset Managers and Ministry Leaders can create disposal requests
create policy "Asset managers and Ministry Leaders can request disposals"
  on inventory.disposal_history for insert
  with check (
    public.is_system_admin()
    or public.is_asset_manager()
    or public.is_ministry_leader()
  );

-- Only Asset Managers can approve disposals
create policy "Asset managers can approve disposals"
  on inventory.disposal_history for update
  using (
    public.is_system_admin()
    or (public.is_asset_manager() and exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    ))
  )
  with check (
    public.is_system_admin()
    or (public.is_asset_manager() and exists (
      select 1 from inventory.asset a
      where a.id = asset_id
      and a.church_branch_id = public.get_user_branch_id()
    ))
  );

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant usage on schemas
grant usage on schema public to authenticated;
grant usage on schema inventory to authenticated;

-- Grant select on all tables for authenticated users (RLS will filter)
grant select on all tables in schema public to authenticated;
grant select on all tables in schema inventory to authenticated;

-- Grant insert/update/delete (RLS policies will control actual access)
grant insert, update, delete on all tables in schema public to authenticated;
grant insert, update, delete on all tables in schema inventory to authenticated;

-- Grant execute on functions
grant execute on function public.get_user_branch_id() to authenticated;
grant execute on function public.user_has_role(text) to authenticated;
grant execute on function public.is_system_admin() to authenticated;
grant execute on function public.is_asset_manager() to authenticated;
grant execute on function public.is_ministry_leader() to authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

comment on function public.get_user_branch_id is 'Returns the church_branch_id for the current authenticated user';
comment on function public.user_has_role is 'Checks if the current user has the specified role';
comment on function public.is_system_admin is 'Returns true if current user is a system admin';
comment on function public.is_asset_manager is 'Returns true if current user has asset_manager role';
comment on function public.is_ministry_leader is 'Returns true if current user is a ministry leader';

