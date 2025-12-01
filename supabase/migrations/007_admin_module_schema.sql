-- Admin Module Schema Enhancements
-- Adds is_active flags, updates role names, and adds constraints for admin functionality

-- =====================================================
-- ADD IS_ACTIVE FLAGS TO CHURCH_BRANCH AND MINISTRY
-- =====================================================

-- Add is_active to church_branch
alter table public.church_branch 
  add column if not exists is_active boolean not null default true;

-- Add is_active to ministry
alter table public.ministry 
  add column if not exists is_active boolean not null default true;

-- =====================================================
-- UPDATE ROLES TABLE TO SUPPORT ADMIN MODULE
-- =====================================================

-- No changes needed to role names - keeping asset_manager
-- The existing constraint already includes the correct role names

-- =====================================================
-- ADD UNIQUENESS CONSTRAINTS
-- =====================================================

-- Ensure church branch names are unique
-- Use DO block to check if constraint exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'church_branch_name_key'
  ) THEN
    ALTER TABLE public.church_branch 
      ADD CONSTRAINT church_branch_name_key UNIQUE(name);
  END IF;
END $$;

-- Ensure ministry names are unique within a branch
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ministry_branch_name_key'
  ) THEN
    ALTER TABLE public.ministry 
      ADD CONSTRAINT ministry_branch_name_key UNIQUE (church_branch_id, name);
  END IF;
END $$;

-- user_roles already has unique constraint from initial schema

-- =====================================================
-- CREATE INDEXES FOR ADMIN QUERIES
-- =====================================================

-- Index for filtering active branches
create index if not exists idx_church_branch_active on public.church_branch(is_active);

-- Index for filtering active ministries
create index if not exists idx_ministry_active on public.ministry(is_active);

-- =====================================================
-- HELPER FUNCTIONS FOR ADMIN ACCESS CONTROL
-- =====================================================

-- Function to check if current user is a system admin
create or replace function public.is_system_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = 'system_admin'
  );
end;
$$ language plpgsql security definer;

-- Function to check if current user is an asset manager (finance admin)
create or replace function public.is_asset_manager()
returns boolean as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = 'asset_manager'
  );
end;
$$ language plpgsql security definer;

-- Function to check if current user is a ministry leader
create or replace function public.is_ministry_leader()
returns boolean as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = 'ministry_leader'
  );
end;
$$ language plpgsql security definer;

-- Function to check if user has any admin role (system_admin or asset_manager)
create or replace function public.is_admin()
returns boolean as $$
begin
  return public.is_system_admin() or public.is_asset_manager();
end;
$$ language plpgsql security definer;

-- Function to get current user's branch ID
create or replace function public.get_user_branch_id()
returns uuid as $$
begin
  return (
    select church_branch_id
    from public.user_profile
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Function to check if user has a specific role
create or replace function public.user_has_role(role_name text)
returns boolean as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
  );
end;
$$ language plpgsql security definer;

-- =====================================================
-- VALIDATION FUNCTIONS FOR ACTIVE STATUS
-- =====================================================

-- Function to validate that a branch is active before assignment
create or replace function public.validate_branch_active()
returns trigger as $$
begin
  if not exists (
    select 1 from public.church_branch
    where id = new.church_branch_id and is_active = true
  ) then
    raise exception 'Cannot assign to inactive branch';
  end if;
  return new;
end;
$$ language plpgsql;

-- Function to validate that a ministry is active before assignment
create or replace function public.validate_ministry_active()
returns trigger as $$
begin
  if new.ministry_id is not null and not exists (
    select 1 from public.ministry
    where id = new.ministry_id and is_active = true
  ) then
    raise exception 'Cannot assign to inactive ministry';
  end if;
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- TRIGGERS FOR ACTIVE STATUS VALIDATION
-- =====================================================

-- Trigger to validate branch is active when creating/updating user_profile
create trigger validate_user_profile_branch_active
  before insert or update on public.user_profile
  for each row
  when (new.church_branch_id is not null)
  execute function public.validate_branch_active();

-- Trigger to validate ministry is active when creating/updating user_profile
create trigger validate_user_profile_ministry_active
  before insert or update on public.user_profile
  for each row
  when (new.ministry_id is not null)
  execute function public.validate_ministry_active();

-- Trigger to validate ministry is active when creating/updating assets
create trigger validate_asset_ministry_active
  before insert or update on inventory.asset
  for each row
  when (new.ministry_assigned is not null)
  execute function public.validate_ministry_active();

-- Trigger to validate branch is active when creating/updating assets
create trigger validate_asset_branch_active
  before insert or update on inventory.asset
  for each row
  when (new.church_branch_id is not null)
  execute function public.validate_branch_active();

-- =====================================================
-- COMMENTS
-- =====================================================

comment on column public.church_branch.is_active is 'When false, prevents new users or assets from being assigned to this branch';
comment on column public.ministry.is_active is 'When false, prevents new users or assets from being assigned to this ministry';
comment on function public.is_system_admin() is 'Returns true if current user has system_admin role';
comment on function public.is_asset_manager() is 'Returns true if current user has asset_manager role';
comment on function public.is_admin() is 'Returns true if current user has system_admin or asset_manager role';
comment on function public.get_user_branch_id() is 'Returns the church_branch_id of the current user';

