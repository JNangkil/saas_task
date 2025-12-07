# Tasks: Add Super Admin Panel

## 1. Super Admin Role

- [ ] 1.1 Add is_super_admin flag to users
- [ ] 1.2 Create SuperAdminMiddleware
- [ ] 1.3 Protected route group for super-admin

## 2. Tenant Management API

- [ ] 2.1 GET /api/super-admin/tenants
- [ ] 2.2 GET /api/super-admin/tenants/{tenant}
- [ ] 2.3 PATCH /api/super-admin/tenants/{tenant}/status
- [ ] 2.4 POST /api/super-admin/tenants/{tenant}/impersonate

## 3. Subscription Management

- [ ] 3.1 GET /api/super-admin/subscriptions/summary
- [ ] 3.2 GET /api/super-admin/subscriptions by plan/status
- [ ] 3.3 PATCH /api/super-admin/tenants/{tenant}/subscription

## 4. Plan Management

- [ ] 4.1 GET /api/super-admin/plans
- [ ] 4.2 POST /api/super-admin/plans
- [ ] 4.3 PATCH /api/super-admin/plans/{plan}
- [ ] 4.4 DELETE /api/super-admin/plans/{plan}

## 5. System Metrics

- [ ] 5.1 GET /api/super-admin/system/metrics
- [ ] 5.2 Calculate global counts
- [ ] 5.3 Daily/weekly signup trends

## 6. System Settings

- [ ] 6.1 GET /api/super-admin/settings
- [ ] 6.2 PATCH /api/super-admin/settings
- [ ] 6.3 Settings model and storage

## 7. Error Logs

- [ ] 7.1 GET /api/super-admin/system/logs
- [ ] 7.2 Error log aggregation
- [ ] 7.3 Health checks endpoint

## 8. Audit Logging

- [ ] 8.1 Log super admin actions
- [ ] 8.2 Store actor, action, details

## 9. Angular Super Admin Module

- [ ] 9.1 Create SuperAdmin Angular app/module
- [ ] 9.2 Separate navigation layout
- [ ] 9.3 Auth guard for super admin

## 10. Tenant List UI

- [ ] 10.1 TenantsListComponent
- [ ] 10.2 Search and filters
- [ ] 10.3 Pagination

## 11. Tenant Detail UI

- [ ] 11.1 TenantDetailComponent
- [ ] 11.2 Stats display
- [ ] 11.3 Enable/disable actions

## 12. System Dashboard UI

- [ ] 12.1 SystemDashboardComponent
- [ ] 12.2 Metric cards and charts
- [ ] 12.3 Error log viewer
