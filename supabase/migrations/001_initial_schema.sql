-- ALIC Fixed Asset Inventory Management System
-- Initial Database Schema
-- 
-- Simplified Design: Asset table uses single ministry field (ministry_assigned)
-- instead of dual ministry ownership (ministry_id + ministry_assigned)

-- =====================================================
-- EXTENSIONS
-- =====================================================
create extension if not exists "pgcrypto";

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- PUBLIC SCHEMA - ORGANIZATIONAL STRUCTURE
-- =====================================================

-- Church branches (multi-tenant root entity)
create table if not exists public.church_branch (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  contact_info text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ministries within church branches
create table if not exists public.ministry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  church_branch_id uuid not null references public.church_branch(id) on delete cascade,
  contact_info text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Roles for RBAC (asset_manager, ministry_leader, system_admin)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (name in ('asset_manager', 'ministry_leader', 'system_admin')),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User role assignments
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz default now(),
  assigned_by uuid references auth.users(id),
  unique(user_id, role_id)
);

-- User profiles with branch membership
create table if not exists public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  church_branch_id uuid not null references public.church_branch(id) on delete restrict,
  ministry_id uuid references public.ministry(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- INVENTORY SCHEMA - ASSET MANAGEMENT
-- =====================================================

create schema if not exists inventory;

-- Fixed assets
-- Note: Simplified to use single ministry field (ministry_assigned)
-- This is the ministry currently using/possessing the asset
create table if not exists inventory.asset (
  id uuid primary key default gen_random_uuid(),
  asset_tag_number text not null unique,
  asset_description text not null,
  category text not null,
  model_or_serial_number text,
  quantity integer not null default 1 check (quantity > 0),
  unit_of_measure text not null default 'pcs',
  acquisition_date date not null,
  acquisition_cost numeric not null check (acquisition_cost >= 0),
  estimated_useful_life_years integer check (estimated_useful_life_years > 0),
  depreciation_method text,
  
  -- Single ministry field (using ministry)
  ministry_assigned uuid not null references public.ministry(id) on delete restrict,
  
  physical_location text not null,
  responsible_ministry_leader text,
  current_condition text not null check (current_condition in ('New', 'Good', 'Fair', 'Poor')),
  asset_status text not null default 'active' check (asset_status in ('active', 'disposed', 'missing')),
  last_verified_date date,
  remarks text,
  
  -- Branch scoping for multi-tenancy
  church_branch_id uuid not null references public.church_branch(id) on delete restrict,
  
  -- Workflow fields
  prepared_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  date_of_entry date not null default current_date,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Asset verification history
create table if not exists inventory.verification_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references inventory.asset(id) on delete cascade,
  verification_date date not null,
  condition text not null check (condition in ('New', 'Good', 'Fair', 'Poor')),
  physical_location_at_verification text not null,
  remarks text,
  verified_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz default now()
);

-- Asset transfer history between ministries
create table if not exists inventory.transfer_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references inventory.asset(id) on delete cascade,
  previous_ministry uuid not null references public.ministry(id) on delete restrict,
  new_ministry uuid not null references public.ministry(id) on delete restrict,
  previous_location text not null,
  new_location text not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  transfer_date date,
  remarks text,
  created_at timestamptz default now(),
  
  check (previous_ministry != new_ministry)
);

-- Asset disposal history
create table if not exists inventory.disposal_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references inventory.asset(id) on delete cascade,
  disposal_method text not null check (disposal_method in ('Sold', 'Donated', 'WrittenOff')),
  disposal_date date not null,
  disposal_value numeric not null check (disposal_value >= 0),
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  remarks text,
  created_at timestamptz default now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Public schema indexes
create index if not exists idx_ministry_branch on public.ministry(church_branch_id);
create index if not exists idx_user_profile_branch on public.user_profile(church_branch_id);
create index if not exists idx_user_profile_ministry on public.user_profile(ministry_id);
create index if not exists idx_user_roles_user on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role_id);

-- Inventory schema indexes
create index if not exists idx_asset_branch on inventory.asset(church_branch_id);
create index if not exists idx_asset_ministry on inventory.asset(ministry_assigned);
create index if not exists idx_asset_status on inventory.asset(asset_status);
create index if not exists idx_asset_category on inventory.asset(category);
create index if not exists idx_asset_tag on inventory.asset(asset_tag_number);

create index if not exists idx_verification_asset on inventory.verification_history(asset_id);
create index if not exists idx_verification_date on inventory.verification_history(verification_date);

create index if not exists idx_transfer_asset on inventory.transfer_history(asset_id);
create index if not exists idx_transfer_previous on inventory.transfer_history(previous_ministry);
create index if not exists idx_transfer_new on inventory.transfer_history(new_ministry);

create index if not exists idx_disposal_asset on inventory.disposal_history(asset_id);
create index if not exists idx_disposal_date on inventory.disposal_history(disposal_date);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =====================================================

-- Public schema triggers
create trigger handle_church_branch_updated_at
  before update on public.church_branch
  for each row execute function public.handle_updated_at();

create trigger handle_ministry_updated_at
  before update on public.ministry
  for each row execute function public.handle_updated_at();

create trigger handle_roles_updated_at
  before update on public.roles
  for each row execute function public.handle_updated_at();

create trigger handle_user_profile_updated_at
  before update on public.user_profile
  for each row execute function public.handle_updated_at();

-- Inventory schema triggers
create trigger handle_asset_updated_at
  before update on inventory.asset
  for each row execute function public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

comment on table inventory.asset is 'Fixed assets owned by church branches and assigned to ministries. Simplified design with single ministry field (ministry_assigned).';
comment on column inventory.asset.ministry_assigned is 'The ministry currently using/possessing this asset';
comment on column inventory.asset.church_branch_id is 'Branch scoping for multi-tenant access control';
comment on column inventory.asset.asset_status is 'active: in use, disposed: permanently removed, missing: lost/stolen';

comment on table inventory.verification_history is 'Physical verification records for asset tracking and accountability';
comment on table inventory.transfer_history is 'History of asset transfers between ministries within the same branch';
comment on table inventory.disposal_history is 'Records of asset disposals (sold, donated, written off)';

comment on table public.user_profile is 'Extended user information with branch membership for multi-tenant access';
comment on table public.roles is 'System roles: finance (full CRUD), ministry_leader (requests only), system_admin (all access)';

