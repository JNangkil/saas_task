# Change: Add Super Admin Panel

## Why

Platform operators need administrative capabilities:
- Manage all tenants from a central dashboard
- Monitor subscriptions and revenue
- Handle support requests via impersonation
- Configure global system settings

## What Changes

### Super Admin Auth
- Super admin role separate from tenant users
- Protected routes and middleware

### Tenant Management
- List, view, enable/disable tenants
- Tenant impersonation for support

### Subscription Overview
- MRR/ARR metrics
- Plan distribution stats

### System Settings
- Global configuration management
- API keys and feature flags

### System Health
- Error log viewing
- Health monitoring

## Impact

### Affected Specs (New Capabilities)
- `super-admin-auth`: Auth, roles, impersonation
- `tenant-management`: CRUD, status, details
- `system-settings`: Config, plans, health

### Dependencies
- Extends tenant and subscription features
- Separate Angular module/app
