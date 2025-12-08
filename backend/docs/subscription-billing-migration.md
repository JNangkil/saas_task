# Subscription Billing Migration Guide

This document explains how to migrate existing tenants to the subscription billing system in your SaaS application.

## Overview

The subscription billing migration system is designed to safely migrate existing tenants to the new subscription model with minimal disruption. The migration process:

1. Creates default subscription plans (Free, Starter, Pro, Enterprise)
2. Assigns appropriate subscriptions to existing tenants
3. Creates Stripe customers for billing integration
4. Handles various tenant scenarios (new vs. existing tenants)
5. Provides comprehensive logging and error handling

## Migration Strategy

### Tenant Classification

The migration classifies tenants into two categories:

1. **New Tenants** (created within the last 30 days)
   - Receive a 14-day trial of the Pro plan
   - Created as Stripe customers
   - Full feature access during trial period

2. **Existing Tenants** (created more than 30 days ago)
   - Assigned the Free plan by default
   - Created as Stripe customers
   - Limited to Free plan features
   - Can upgrade to paid plans at any time

### Special Cases

- **High-activity existing tenants** (5+ users or 3+ workspaces) are grandfathered into a Pro trial
- **Tenants with existing subscriptions** are skipped by default (use `--force` to override)
- **Tenants with existing Stripe customers** are linked but not recreated

## Running the Migration

### Prerequisites

1. Ensure all database migrations are up to date:
   ```bash
   php artisan migrate
   ```

2. Configure your Stripe credentials in `.env`:
   ```env
   STRIPE_KEY=pk_test_...
   STRIPE_SECRET=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Verify billing configuration:
   ```bash
   php artisan config:cache
   ```

### Basic Migration

To run the migration for all tenants:
```bash
php artisan billing:migrate
```

### Dry Run (Preview Changes)

To see what would be changed without applying them:
```bash
php artisan billing:migrate --dry-run
```

### Processing a Specific Tenant

To migrate only a specific tenant:
```bash
php artisan billing:migrate --tenant-id=123
```

### Batch Processing

For large datasets, adjust the batch size:
```bash
php artisan billing:migrate --batch-size=50
```

### Force Re-run

To re-run the migration even if it was completed before:
```bash
php artisan billing:migrate --force
```

### Skip Stripe Customer Creation

To skip Stripe customer creation (useful for testing):
```bash
php artisan billing:migrate --skip-stripe
```

## Rollback

To rollback the migration (deletes subscriptions created by the migration):
```bash
php artisan billing:migrate --rollback
```

To preview what would be rolled back:
```bash
php artisan billing:migrate --rollback --dry-run
```

## Data Created

### Subscription Plans

The migration creates four default plans:

| Plan | Price | Trial Days | Users | Workspaces | Boards | Storage |
|------|-------|------------|-------|------------|--------|---------|
| Free | $0.00 | 0 | 3 | 1 | 5 | 100 MB |
| Starter | $19.99 | 14 | 10 | 3 | 20 | 1 GB |
| Pro | $49.99 | 14 | 50 | 10 | 100 | 10 GB |
| Enterprise | $199.99 | 30 | Unlimited | Unlimited | Unlimited | Unlimited |

### Subscriptions

For each tenant, the migration creates:
- A subscription record with appropriate plan
- Trial dates for eligible tenants
- Metadata tracking migration source and reasoning
- Stripe customer ID (if created)

### Stripe Customers

Each tenant gets a Stripe customer with:
- Tenant name and billing email
- Metadata linking to tenant ID and slug
- No payment methods attached (added during upgrade)

## Post-Migration Verification

### Database Verification

Check that all tenants have subscriptions:
```sql
SELECT t.id, t.name, s.plan_id, s.status, s.trial_ends_at
FROM tenants t
LEFT JOIN subscriptions s ON t.id = s.tenant_id
WHERE s.id IS NULL;
```

Check Stripe customer creation:
```sql
SELECT id, name, stripe_customer_id
FROM tenants
WHERE stripe_customer_id IS NULL;
```

### Application Verification

1. **Test tenant access**: Verify tenants can access features according to their plan limits
2. **Test upgrade flow**: Ensure tenants can upgrade to paid plans
3. **Check trial functionality**: Verify trial periods work correctly
4. **Verify billing integration**: Test Stripe checkout and portal access

### Monitoring

Monitor logs for any issues:
```bash
tail -f storage/logs/laravel.log | grep "subscription"
```

## Troubleshooting

### Common Issues

1. **Stripe API Errors**
   - Check API credentials in `.env`
   - Verify Stripe account is active
   - Check rate limits

2. **Database Transaction Errors**
   - Ensure sufficient disk space
   - Check database connection
   - Verify table locks

3. **Memory Issues with Large Datasets**
   - Reduce batch size: `--batch-size=10`
   - Increase PHP memory limit
   - Run during low-traffic periods

### Error Recovery

If the migration fails partway through:

1. Check logs for specific error messages
2. Fix the underlying issue
3. Re-run with `--force` to continue from where it left off

### Manual Intervention

For specific tenants that need special handling:
1. Use `--tenant-id` to process individually
2. Manually adjust subscriptions in the database
3. Create Stripe customers manually if needed

## Best Practices

1. **Backup First**: Always create a database backup before migration
2. **Test in Staging**: Run the full migration in a staging environment first
3. **Schedule Downtime**: Consider scheduling during low-traffic periods
4. **Monitor Progress**: Use the progress bar and logs to monitor progress
5. **Communicate**: Notify users about upcoming changes to their billing

## Performance Considerations

- Batch processing prevents memory issues with large tenant counts
- Database transactions ensure data consistency
- Progress indicators provide visibility into long-running operations
- Dry run mode allows testing without side effects

## Security Considerations

- All operations are logged for audit purposes
- Stripe API keys are securely stored in environment variables
- Database transactions prevent partial data corruption
- Rollback capability allows quick recovery from issues

## Support

For issues with the migration:

1. Check Laravel logs: `storage/logs/laravel.log`
2. Review Stripe dashboard for API issues
3. Check database constraints and indexes
4. Verify environment configuration

## Future Enhancements

Potential improvements to consider:

1. **Selective Migration**: Ability to migrate tenants based on specific criteria
2. **Custom Plans**: Support for custom migration plans per tenant
3. **Email Notifications**: Automated emails to tenants about their new subscriptions
4. **Analytics Dashboard**: Migration progress and success metrics
5. **Automated Testing**: Built-in validation tests post-migration