# Testing New Features

## Table of Contents

1. [Admin Module Testing](#admin-module-testing)
2. [Disposal Workflow & Protections](#disposal-workflow--protections)

---

# Admin Module Testing

## Prerequisites

- ✅ Migrations 007, 008, 009 applied
- ✅ App running (`npm run dev`)
- ✅ Logged in as System Admin or Finance user

---

## Test 1: Branch Management

### Step 1: Navigate to Branches

1. Go to: http://localhost:3000/admin/branches
2. Verify the page loads with branch list

**Expected Result:**

- Page title: "Church Branches"
- Table showing existing branches (if any)
- "Add Branch" button visible (System Admin only)

### Step 2: Create New Branch (System Admin only)

1. Click "Add Branch" button
2. Fill in:
   - Name: "ALIC Test Branch"
   - Location: "Test Location, USA"
   - Contact Info: "test@example.com"
3. Click "Create Branch"

**Expected Result:**

- Success toast: "Branch created successfully"
- New branch appears in the table
- Status badge shows "Active"

### Step 3: Edit Branch

1. Click the Edit button (pencil icon) for a branch
2. Change the location to "Updated Location"
3. Click "Save Changes"

**Expected Result:**

- Success toast: "Branch updated successfully"
- Branch location is updated in the table

### Step 4: Deactivate Branch

1. Click the PowerOff button for a branch
2. Confirm the action

**Expected Result:**

- Success toast: "Branch deactivated"
- Status badge changes to "Inactive"
- Button changes to Power icon (to reactivate)

### Step 5: Reactivate Branch

1. Click the Power button for an inactive branch

**Expected Result:**

- Success toast: "Branch activated"
- Status badge changes back to "Active"

---

## Test 2: Ministry Management

### Step 1: Navigate to Ministries

1. Go to: http://localhost:3000/admin/ministries
2. Verify the page loads with ministry list

**Expected Result:**

- Page title: "Ministries"
- Table showing existing ministries (if any)
- Branch filter dropdown
- "Add Ministry" button visible

### Step 2: Filter by Branch

1. Select a branch from the filter dropdown
2. Verify only ministries from that branch are shown

**Expected Result:**

- Table updates to show only ministries from selected branch
- URL updates with query parameter

### Step 3: Create New Ministry

1. Click "Add Ministry" button
2. Fill in:
   - Name: "Test Ministry"
   - Branch: Select an active branch
   - Contact Info: "Leader: John Doe"
3. Click "Create Ministry"

**Expected Result:**

- Success toast: "Ministry created successfully"
- New ministry appears in the table
- Status badge shows "Active"
- Branch name is displayed correctly

### Step 4: Edit Ministry

1. Click the Edit button for a ministry
2. Change the name to "Updated Ministry"
3. Note that branch field is disabled
4. Click "Save Changes"

**Expected Result:**

- Success toast: "Ministry updated successfully"
- Ministry name is updated in the table
- Branch remains unchanged (cannot be edited)

### Step 5: Deactivate Ministry

1. Click the PowerOff button for a ministry

**Expected Result:**

- Success toast: "Ministry deactivated"
- Status badge changes to "Inactive"

### Step 6: Try to Create Ministry in Inactive Branch

1. Deactivate a branch first
2. Try to create a ministry in that branch

**Expected Result:**

- Error message: "Cannot create ministry in inactive branch"
- Ministry is not created

---

## Test 3: User & Role Management

### Step 1: Navigate to Users

1. Go to: http://localhost:3000/admin/users
2. Verify the page loads with user list

**Expected Result:**

- Page title: "Users & Roles"
- Table showing all users with their profiles
- Columns: Name, Email, Branch, Ministry, Roles
- Branch filter dropdown

### Step 2: Filter by Branch

1. Select a branch from the filter dropdown
2. Verify only users from that branch are shown

**Expected Result:**

- Table updates to show only users from selected branch

### Step 3: Edit User Profile

1. Click the Edit button for a user
2. Update:
   - Full Name: "Test User Updated"
   - Branch: Select a different branch (System Admin only)
   - Ministry: Select a ministry from the new branch
3. Click "Save Changes"

**Expected Result:**

- Success toast: "User profile updated successfully"
- User's information is updated in the table

### Step 4: Assign Role to User

1. Click the "Roles" button for a user
2. In the "Add Role" dropdown, select "asset_manager"
3. Click "Add Role"

**Expected Result:**

- Success toast: "Role assigned successfully"
- New role badge appears in the "Current Roles" section
- Role also appears in the main table

### Step 5: Remove Role from User

1. In the Manage Roles dialog, find an existing role
2. Click the X button next to the role

**Expected Result:**

- Success toast: "Role removed successfully"
- Role badge disappears from the list
- Role is removed from the main table

### Step 6: Test Asset Manager Restrictions

1. Log in as an Asset Manager user (not System Admin)
2. Try to edit a user from another branch

**Expected Result:**

- Edit button should not work or show error
- User should only see users from their own branch

### Step 7: Test System Admin Role Assignment

1. Log in as Asset Manager user
2. Try to assign "system_admin" role to a user

**Expected Result:**

- "system_admin" should not appear in the available roles dropdown
- Or error message: "Only system admins can assign the system_admin role"

---

## Test 4: Branch-Aware Security

### Step 1: Test Inactive Branch Protection

1. Create a user profile
2. Try to assign them to an inactive branch

**Expected Result:**

- Error message: "Cannot assign user to inactive branch"
- User profile is not created/updated

### Step 2: Test Inactive Ministry Protection

1. Edit a user profile
2. Try to assign them to an inactive ministry

**Expected Result:**

- Error message: "Cannot assign user to inactive ministry"
- User profile is not updated

### Step 3: Test Cross-Branch Ministry Assignment

1. Edit a user in Branch A
2. Try to assign them to a ministry in Branch B

**Expected Result:**

- Error message: "Ministry does not belong to the target branch"
- User profile is not updated

---

## Test 5: Role-Based Access Control

### Test as System Admin

1. Log in as System Admin
2. Verify you can:
   - ✅ Create, edit, deactivate branches
   - ✅ Create, edit, deactivate ministries in any branch
   - ✅ Edit users in any branch
   - ✅ Move users between branches
   - ✅ Assign any role including system_admin

### Test as Asset Manager

1. Log in as Asset Manager user
2. Verify you can:
   - ✅ View all branches (but not edit them)
   - ✅ Create, edit, deactivate ministries in your branch only
   - ✅ Edit users in your branch only
   - ✅ Assign asset_manager and ministry_leader roles
3. Verify you cannot:
   - ❌ Create or edit branches
   - ❌ Manage ministries in other branches
   - ❌ Edit users in other branches
   - ❌ Move users to another branch
   - ❌ Assign system_admin role

### Test as Ministry Leader

1. Log in as Ministry Leader
2. Verify you cannot:
   - ❌ Access /admin/branches
   - ❌ Access /admin/ministries
   - ❌ Access /admin/users

---

## Test 6: Data Integrity

### Test 1: Unique Branch Names

1. Create a branch with name "Test Branch"
2. Try to create another branch with the same name

**Expected Result:**

- Error message: "A branch with this name already exists"
- Second branch is not created

### Test 2: Unique Ministry Names per Branch

1. Create a ministry "Worship" in Branch A
2. Try to create another ministry "Worship" in Branch A
3. Create a ministry "Worship" in Branch B (should succeed)

**Expected Result:**

- Error for duplicate in same branch
- Success for same name in different branch

### Test 3: User Role Uniqueness

1. Assign "finance" role to a user
2. Try to assign "finance" role to the same user again

**Expected Result:**

- Error message: "User already has this role"
- Duplicate role is not created

---

# Disposal Workflow & Protections

## Prerequisites

- ✅ Migrations 003, 004, 005 applied
- ✅ App running (`npm run dev`)
- ✅ Logged in as Asset Manager

---

## Test 1: New 3-Step Disposal Workflow

### Step 1: Navigate to Disposals

1. Go to: http://localhost:3000/inventory/disposals
2. Look at the existing disposal records

**Expected Result:**

- You should see a "Review" button for any Pending disposals
- Status badge should be yellow "Pending"

### Step 2: Click "Review"

1. Find a disposal with status "Pending"
2. Click the "Review" button (Eye icon)

**Expected Result:**

- Status changes to blue "Reviewed"
- Button changes to "Approve" (green) + "Reject" (red)

### Step 3: Click "Approve"

1. Click the green "Approve" button

**Expected Result:**

- Status changes to green "Approved"
- The asset's status becomes "disposed"
- The asset disappears from disposal/transfer form dropdowns
- Buttons disappear (no further actions)

### Alternative: Click "Reject"

1. Instead of Approve, click red "Reject"

**Expected Result:**

- Status changes to red "Rejected"
- Asset remains "active" (not disposed)
- Buttons disappear

---

## Test 2: Create New Disposal Request

### Step 1: Open Dialog

1. Click "Request Disposal" button
2. Select an **active** asset from dropdown

**Expected Result:**

- Only active assets appear in dropdown
- Previously disposed assets are NOT in the list

### Step 2: Fill Form

1. Select disposal method (Sold, Donated, etc.)
2. Enter value
3. Add remarks
4. Submit

**Expected Result:**

- New disposal created with status "Pending"
- Shows "Review" button

---

## Test 3: Database Protection (Re-Disposal)

### Scenario: Try to dispose an already-disposed asset

**Method 1: Via UI (Should not be possible)**

1. Open "Request Disposal" dialog
2. Look for a disposed asset in the dropdown

**Expected Result:**

- ✅ Disposed assets don't appear in dropdown

**Method 2: Via Database (Trigger should block)**

1. Go to Supabase SQL Editor
2. Find a disposed asset's UUID
3. Try to insert a disposal record:

   ```sql
   -- Get a disposed asset ID first
   SELECT id, asset_tag_number, asset_status
   FROM inventory.asset
   WHERE asset_status = 'disposed'
   LIMIT 1;

   -- Try to create disposal (should fail)
   INSERT INTO inventory.disposal_history (
     asset_id,
     disposal_method,
     disposal_date,
     disposal_value,
     requested_by
   )
   VALUES (
     '<disposed-asset-uuid>',
     'Sold',
     '2024-01-01',
     100,
     '<your-user-uuid>'
   );
   ```

**Expected Result:**

- ❌ Error: "Cannot create disposal request for non-active asset"
- ✅ Database trigger blocks the operation

---

## Test 4: Database Protection (Transfer)

### Try to transfer a disposed asset

**Via Database:**

```sql
-- Get a disposed asset ID
SELECT id, asset_tag_number, asset_status
FROM inventory.asset
WHERE asset_status = 'disposed'
LIMIT 1;

-- Try to create transfer (should fail)
INSERT INTO inventory.transfer_history (
  asset_id,
  previous_ministry,
  new_ministry,
  previous_location,
  new_location,
  requested_by
)
VALUES (
  '<disposed-asset-uuid>',
  '<ministry-uuid>',
  '<ministry-uuid>',
  'Location A',
  'Location B',
  '<your-user-uuid>'
);
```

**Expected Result:**

- ❌ Error: "Cannot create transfer request for non-active asset"
- ✅ Database trigger blocks the operation

---

## Test 5: Database Protection (Edit)

### Try to edit a disposed asset

**Via Database:**

```sql
-- Get a disposed asset ID
SELECT id, asset_tag_number, asset_status, asset_description
FROM inventory.asset
WHERE asset_status = 'disposed'
LIMIT 1;

-- Try to update description (should fail)
UPDATE inventory.asset
SET asset_description = 'New description'
WHERE id = '<disposed-asset-uuid>'
AND asset_status = 'disposed';
```

**Expected Result:**

- ❌ Error: "Cannot update disposed asset"
- ✅ Database trigger blocks the operation

---

## Test 6: Recovery Scenario (Reactivation)

### Reactivate a disposed asset (should be allowed)

```sql
-- This SHOULD succeed (status change allowed for recovery)
UPDATE inventory.asset
SET asset_status = 'active',
    ministry_assigned = '<ministry-uuid>'
WHERE id = '<disposed-asset-uuid>';
```

**Expected Result:**

- ✅ Update succeeds
- Asset becomes active again
- Asset appears in disposal/transfer dropdowns

---

## Quick Visual Checklist

After migrations, on `/inventory/disposals` you should see:

- [ ] "Review" button for Pending disposals (Eye icon)
- [ ] "Approve" + "Reject" buttons for Reviewed disposals
- [ ] Four status colors: Yellow, Blue, Green, Red
- [ ] "Last Action By" column (not "Approved By")
- [ ] Disposed assets don't appear in "Request Disposal" dropdown

---

## If You Don't See Changes:

1. **Hard refresh the browser**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. **Check migration was applied**:

   ```sql
   -- Check if new columns exist
   SELECT reviewed_by, rejected_by, approved_at
   FROM inventory.disposal_history
   LIMIT 1;

   -- Check if triggers exist
   SELECT trigger_name, event_object_table
   FROM information_schema.triggers
   WHERE trigger_schema = 'inventory';
   ```

3. **Check browser console** for errors
4. **Verify you're logged in as Asset Manager**

---

## Current Disposal Records

To see the workflow in action, you need existing disposal records. Check if you have any:

```sql
SELECT
  dh.id,
  a.asset_tag_number,
  dh.disposal_method,
  CASE
    WHEN dh.rejected_by IS NOT NULL THEN 'Rejected'
    WHEN dh.approved_by IS NOT NULL THEN 'Approved'
    WHEN dh.reviewed_by IS NOT NULL THEN 'Reviewed'
    ELSE 'Pending'
  END as status
FROM inventory.disposal_history dh
JOIN inventory.asset a ON a.id = dh.asset_id
ORDER BY dh.created_at DESC;
```

If no records exist, create one using "Request Disposal" button!
