-- Seed Admin Roles
-- Creates the three core roles: asset_manager, ministry_leader, system_admin

-- =====================================================
-- SEED CORE ROLES
-- =====================================================

-- Insert roles if they don't exist
-- Using ON CONFLICT to make this migration idempotent

insert into public.roles (name, description)
values
  ('asset_manager', 'Asset manager with full CRUD on assets and approval authority for transfers/disposals within their branch')
on conflict (name) do update
  set description = excluded.description;

insert into public.roles (name, description)
values
  ('ministry_leader', 'Ministry leader who can create verification, transfer, and disposal requests')
on conflict (name) do update
  set description = excluded.description;

insert into public.roles (name, description)
values
  ('system_admin', 'System administrator with full access across all branches and all administrative functions')
on conflict (name) do update
  set description = excluded.description;

-- =====================================================
-- COMMENTS
-- =====================================================

comment on table public.roles is 'System roles: asset_manager (branch-level admin), ministry_leader (request creator), system_admin (global admin)';

