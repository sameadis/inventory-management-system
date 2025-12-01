# Admin Module Deployment Checklist

Use this checklist to deploy the Admin Module to your environment.

## Pre-Deployment

### 1. Review Documentation
- [ ] Read [ADMIN_MODULE_GUIDE.md](ADMIN_MODULE_GUIDE.md)
- [ ] Review [ADMIN_MODULE_IMPLEMENTATION_SUMMARY.md](ADMIN_MODULE_IMPLEMENTATION_SUMMARY.md)
- [ ] Review test cases in [TEST_NEW_FEATURES.md](TEST_NEW_FEATURES.md)

### 2. Backup Current Database
- [ ] Create a full database backup
- [ ] Export current user data
- [ ] Export current branch and ministry data
- [ ] Document current role assignments

### 3. Prepare Migration Scripts
- [ ] Review `007_admin_module_schema.sql`
- [ ] Review `008_admin_rls_policies.sql`
- [ ] Review `009_seed_admin_roles.sql`
- [ ] Customize `010_backfill_existing_data.sql` with your data

## Database Migration

### 4. Apply Schema Changes
- [ ] Run `007_admin_module_schema.sql` in Supabase SQL Editor
- [ ] Verify no errors in output
- [ ] Check that `is_active` columns were added to tables

### 5. Apply RLS Policies
- [ ] Run `008_admin_rls_policies.sql` in Supabase SQL Editor
- [ ] Verify RLS is enabled on all admin tables
- [ ] Check that policies were created successfully

### 6. Seed Roles
- [ ] Run `009_seed_admin_roles.sql` in Supabase SQL Editor
- [ ] Verify three roles exist: `finance`, `ministry_leader`, `system_admin`
- [ ] Check that old `asset_manager` role was renamed to `finance`

### 7. Backfill Existing Data
- [ ] Customize `010_backfill_existing_data.sql` with your user emails and branch IDs
- [ ] Test the script in a development environment first
- [ ] Run the customized backfill script
- [ ] Verify all users have `user_profile` records
- [ ] Verify at least one user has `system_admin` role
- [ ] Check that all branches and ministries are active

## Application Deployment

### 8. Deploy Code Changes
- [ ] Commit all changes to version control
- [ ] Deploy to staging/development environment first
- [ ] Run `npm install` to ensure dependencies are up to date
- [ ] Build the application: `npm run build`
- [ ] Deploy to production

### 9. Verify Deployment
- [ ] Application starts without errors
- [ ] No TypeScript compilation errors
- [ ] No linter errors
- [ ] All pages load correctly

## Testing

### 10. Test as System Admin
- [ ] Log in as a user with `system_admin` role
- [ ] Navigate to `/admin/branches`
- [ ] Create a test branch
- [ ] Edit the test branch
- [ ] Deactivate and reactivate the test branch
- [ ] Navigate to `/admin/ministries`
- [ ] Create a test ministry
- [ ] Edit the test ministry
- [ ] Filter ministries by branch
- [ ] Navigate to `/admin/users`
- [ ] Edit a user's profile
- [ ] Assign a role to a user
- [ ] Remove a role from a user
- [ ] Filter users by branch

### 11. Test as Finance User
- [ ] Log in as a user with `finance` role (not `system_admin`)
- [ ] Verify you can view branches but not edit them
- [ ] Verify you can only manage ministries in your branch
- [ ] Verify you can only manage users in your branch
- [ ] Verify you cannot assign `system_admin` role
- [ ] Try to edit a user from another branch (should fail)

### 12. Test Security
- [ ] Try to create a user in an inactive branch (should fail)
- [ ] Try to assign a user to an inactive ministry (should fail)
- [ ] Try to create a ministry with a duplicate name in the same branch (should fail)
- [ ] Verify unique constraints are working
- [ ] Verify RLS policies are enforced

### 13. Test Data Integrity
- [ ] Verify all existing assets still reference valid branches
- [ ] Verify all existing assets still reference valid ministries
- [ ] Verify all existing users have profiles
- [ ] Verify no broken references in the database

## Post-Deployment

### 14. User Training
- [ ] Train system admins on branch management
- [ ] Train finance admins on ministry and user management
- [ ] Provide access to [ADMIN_MODULE_GUIDE.md](ADMIN_MODULE_GUIDE.md)
- [ ] Document your organization's specific workflows

### 15. Assign Initial Roles
- [ ] Assign `system_admin` role to central administrators
- [ ] Assign `finance` role to branch finance administrators
- [ ] Assign `ministry_leader` role to ministry leaders
- [ ] Verify each user has the correct branch assignment

### 16. Clean Up
- [ ] Delete any test branches created during testing
- [ ] Delete any test ministries created during testing
- [ ] Remove any test role assignments
- [ ] Update documentation with production-specific notes

### 17. Monitoring
- [ ] Monitor application logs for errors
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Set up alerts for failed operations

## Rollback Plan

If issues arise, follow these steps to rollback:

### Database Rollback
- [ ] Restore database from backup
- [ ] Verify data integrity after restore
- [ ] Test application with restored database

### Application Rollback
- [ ] Revert to previous deployment
- [ ] Verify application works with current database
- [ ] Document issues encountered

## Success Criteria

The deployment is successful when:

- ✅ All migrations applied without errors
- ✅ All users have `user_profile` records
- ✅ At least one `system_admin` user exists
- ✅ All three admin pages load correctly
- ✅ System admins can manage all branches, ministries, and users
- ✅ Finance users can only manage data in their branch
- ✅ Role assignments work correctly
- ✅ Active status validation is enforced
- ✅ No broken references in the database
- ✅ All existing functionality still works

## Support

If you encounter issues:

1. Check the [ADMIN_MODULE_GUIDE.md](ADMIN_MODULE_GUIDE.md) troubleshooting section
2. Review error messages in browser console and server logs
3. Verify database migrations were applied correctly
4. Check RLS policies are enabled and correct
5. Verify user has the correct roles assigned

## Notes

Add any deployment-specific notes here:

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Environment:** [ ] Development [ ] Staging [ ] Production

**Issues Encountered:** _________________

**Resolution:** _________________

