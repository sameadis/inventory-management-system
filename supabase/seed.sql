-- ALIC Fixed Asset Inventory Management System
-- Seed Data (Development/Testing)
--
-- This file contains sample data for development and testing.
-- Uncomment and modify as needed.

-- =====================================================
-- DEFAULT ROLES (Already created by schema, but verify)
-- =====================================================

-- Insert default roles if not exists
INSERT INTO public.roles (name, description)
VALUES 
  ('system_admin', 'Full system access across all branches'),
  ('finance', 'Full CRUD on assets, approve requests'),
  ('ministry_leader', 'Create verification/transfer/disposal requests')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SAMPLE CHURCH BRANCHES
-- =====================================================

-- Example: Uncomment and modify with your actual data
/*
INSERT INTO public.church_branch (id, name, location, contact_info)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Main Campus', 'Downtown, City', 'main@church.org'),
  ('22222222-2222-2222-2222-222222222222', 'North Campus', 'Northside, City', 'north@church.org')
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- SAMPLE MINISTRIES
-- =====================================================

-- Example: Uncomment and modify
/*
INSERT INTO public.ministry (id, name, church_branch_id, contact_info)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Worship Ministry', '11111111-1111-1111-1111-111111111111', 'worship@church.org'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Youth Ministry', '11111111-1111-1111-1111-111111111111', 'youth@church.org'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Children Ministry', '11111111-1111-1111-1111-111111111111', 'children@church.org'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Admin', '11111111-1111-1111-1111-111111111111', 'admin@church.org')
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- SAMPLE USER PROFILES & ROLES
-- =====================================================

-- Note: User IDs must match auth.users table entries
-- These should be created after users sign up via Supabase Auth

-- Example: Finance user profile and role assignment
/*
INSERT INTO public.user_profile (id, full_name, church_branch_id, ministry_id)
VALUES (
  'user-uuid-from-auth-table',
  'Jane Finance',
  '11111111-1111-1111-1111-111111111111',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id, assigned_by)
VALUES (
  'user-uuid-from-auth-table',
  (SELECT id FROM public.roles WHERE name = 'finance'),
  'admin-uuid'
)
ON CONFLICT (user_id, role_id) DO NOTHING;
*/

-- =====================================================
-- SAMPLE ASSETS
-- =====================================================

-- Example: Some typical church assets
/*
INSERT INTO inventory.asset (
  asset_tag_number,
  asset_description,
  category,
  model_or_serial_number,
  quantity,
  unit_of_measure,
  acquisition_date,
  acquisition_cost,
  estimated_useful_life_years,
  depreciation_method,
  ministry_assigned,
  physical_location,
  responsible_ministry_leader,
  current_condition,
  asset_status,
  church_branch_id,
  prepared_by,
  date_of_entry
)
VALUES 
  (
    'WOR-001',
    'Yamaha Digital Piano',
    'Musical Equipment',
    'P-125',
    1,
    'pcs',
    '2023-01-15',
    1299.99,
    10,
    'Straight-line',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Main Sanctuary',
    'John Smith',
    'Good',
    'active',
    '11111111-1111-1111-1111-111111111111',
    'user-uuid-finance',
    '2023-01-15'
  ),
  (
    'YTH-001',
    'Projector - Epson',
    'Audio/Visual Equipment',
    'EpiqVision Ultra LS800',
    1,
    'pcs',
    '2023-03-20',
    2999.99,
    7,
    'Straight-line',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Youth Room',
    'Sarah Johnson',
    'New',
    'active',
    '11111111-1111-1111-1111-111111111111',
    'user-uuid-finance',
    '2023-03-20'
  ),
  (
    'CHD-001',
    'Tables - Children Classroom',
    'Furniture',
    null,
    10,
    'pcs',
    '2022-08-10',
    499.99,
    15,
    'Straight-line',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Children Building - Room 101',
    'Mary Williams',
    'Fair',
    'active',
    '11111111-1111-1111-1111-111111111111',
    'user-uuid-finance',
    '2022-08-10'
  );
*/

-- =====================================================
-- SAMPLE VERIFICATION HISTORY
-- =====================================================

/*
INSERT INTO inventory.verification_history (
  asset_id,
  verification_date,
  condition,
  physical_location_at_verification,
  remarks,
  verified_by
)
SELECT 
  a.id,
  CURRENT_DATE,
  'Good',
  a.physical_location,
  'Annual verification - asset in good condition',
  'user-uuid-verifier'
FROM inventory.asset a
WHERE a.asset_tag_number = 'WOR-001';
*/

-- =====================================================
-- NOTES
-- =====================================================

-- To use this seed file:
-- 1. Replace UUIDs with actual values from your auth.users table
-- 2. Uncomment the sections you need
-- 3. Modify data to match your church structure
-- 4. Run: psql "connection-string" < supabase/seed.sql

-- Remember: 
-- - User profiles must reference existing auth.users records
-- - Ministry IDs must reference existing ministries
-- - Branch IDs must exist before creating dependent records
-- - Assets require valid ministry_assigned and prepared_by values

