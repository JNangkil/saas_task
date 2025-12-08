<?php

namespace App\Helpers;

use App\Models\Tenant;
use App\Models\Subscription;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * SubscriptionHelper
 * 
 * Provides utility methods for checking subscription limits throughout the application.
 * This helper can be used in controllers, services, or other parts of the application
 * to validate subscription constraints before performing actions.
 * 
 * @package App\Helpers
 */
class SubscriptionHelper
{
    /**
     * Check if a tenant can add more users.
     *
     * @param Tenant $tenant
     * @param int $additionalUsers
     * @return array
     */
    public static function canAddUsers(Tenant $tenant, int $additionalUsers = 1): array
    {
        $subscription = $tenant->activeSubscription;
        
        if (!$subscription) {
            return [
                'can' => false,
                'reason' => 'no_subscription',
                'message' => 'Tenant does not have an active subscription',
            ];
        }
        
        if (!$subscription->isValid()) {
            return [
                'can' => false,
                'reason' => 'invalid_subscription',
                'message' => 'Subscription is not active or valid',
            ];
        }
        
        $maxUsers = $subscription->getPlanLimit('max_users');
        
        // If unlimited (0), can always add users
        if ($maxUsers === 0 || $maxUsers === null) {
            return ['can' => true];
        }
        
        $currentUsers = $tenant->users()->count();
        $projectedUsers = $currentUsers + $additionalUsers;
        
        if ($projectedUsers > $maxUsers) {
            return [
                'can' => false,
                'reason' => 'limit_exceeded',
                'message' => "Cannot add {$additionalUsers} users. Current: {$currentUsers}, Max: {$maxUsers}",
                'current' => $currentUsers,
                'max' => $maxUsers,
                'additional' => $additionalUsers,
            ];
        }
        
        return ['can' => true];
    }
    
    /**
     * Check if a tenant can create more workspaces.
     *
     * @param Tenant $tenant
     * @param int $additionalWorkspaces
     * @return array
     */
    public static function canCreateWorkspaces(Tenant $tenant, int $additionalWorkspaces = 1): array
    {
        $subscription = $tenant->activeSubscription;
        
        if (!$subscription) {
            return [
                'can' => false,
                'reason' => 'no_subscription',
                'message' => 'Tenant does not have an active subscription',
            ];
        }
        
        if (!$subscription->isValid()) {
            return [
                'can' => false,
                'reason' => 'invalid_subscription',
                'message' => 'Subscription is not active or valid',
            ];
        }
        
        $maxWorkspaces = $subscription->getPlanLimit('max_workspaces');
        
        // If unlimited (0), can always create workspaces
        if ($maxWorkspaces === 0 || $maxWorkspaces === null) {
            return ['can' => true];
        }
        
        $currentWorkspaces = $tenant->workspaces()->count();
        $projectedWorkspaces = $currentWorkspaces + $additionalWorkspaces;
        
        if ($projectedWorkspaces > $maxWorkspaces) {
            return [
                'can' => false,
                'reason' => 'limit_exceeded',
                'message' => "Cannot create {$additionalWorkspaces} workspaces. Current: {$currentWorkspaces}, Max: {$maxWorkspaces}",
                'current' => $currentWorkspaces,
                'max' => $maxWorkspaces,
                'additional' => $additionalWorkspaces,
            ];
        }
        
        return ['can' => true];
    }
    
    /**
     * Check if a tenant can upload files of a specific size.
     *
     * @param Tenant $tenant
     * @param float $fileSizeMb
     * @return array
     */
    public static function canUploadFiles(Tenant $tenant, float $fileSizeMb): array
    {
        $subscription = $tenant->activeSubscription;
        
        if (!$subscription) {
            return [
                'can' => false,
                'reason' => 'no_subscription',
                'message' => 'Tenant does not have an active subscription',
            ];
        }
        
        if (!$subscription->isValid()) {
            return [
                'can' => false,
                'reason' => 'invalid_subscription',
                'message' => 'Subscription is not active or valid',
            ];
        }
        
        $maxStorageMb = $subscription->getPlanLimit('max_storage_mb');
        
        // If unlimited (0), can always upload files
        if ($maxStorageMb === 0 || $maxStorageMb === null) {
            return ['can' => true];
        }
        
        $currentStorageMb = self::getCurrentStorageUsage($tenant);
        $projectedStorageMb = $currentStorageMb + $fileSizeMb;
        
        if ($projectedStorageMb > $maxStorageMb) {
            return [
                'can' => false,
                'reason' => 'limit_exceeded',
                'message' => "Cannot upload file of {$fileSizeMb}MB. Current: {$currentStorageMb}MB, Max: {$maxStorageMb}MB",
                'current' => $currentStorageMb,
                'max' => $maxStorageMb,
                'additional' => $fileSizeMb,
            ];
        }
        
        return ['can' => true];
    }
    
    /**
     * Check if a tenant can use a specific feature.
     *
     * @param Tenant $tenant
     * @param string $feature
     * @return array
     */
    public static function canUseFeature(Tenant $tenant, string $feature): array
    {
        $subscription = $tenant->activeSubscription;
        
        if (!$subscription) {
            return [
                'can' => false,
                'reason' => 'no_subscription',
                'message' => 'Tenant does not have an active subscription',
            ];
        }
        
        if (!$subscription->isValid()) {
            return [
                'can' => false,
                'reason' => 'invalid_subscription',
                'message' => 'Subscription is not active or valid',
            ];
        }
        
        if (!$subscription->hasFeature($feature)) {
            return [
                'can' => false,
                'reason' => 'feature_not_available',
                'message' => "Feature '{$feature}' is not available in the current plan",
            ];
        }
        
        return ['can' => true];
    }
    
    /**
     * Get a summary of all subscription limits for a tenant.
     *
     * @param Tenant $tenant
     * @return array
     */
    public static function getSubscriptionLimitsSummary(Tenant $tenant): array
    {
        $subscription = $tenant->activeSubscription;
        
        if (!$subscription) {
            return [
                'has_subscription' => false,
                'message' => 'No active subscription',
            ];
        }
        
        $limits = [];
        
        // User limit
        $maxUsers = $subscription->getPlanLimit('max_users');
        $currentUsers = $tenant->users()->count();
        $limits['users'] = [
            'current' => $currentUsers,
            'max' => $maxUsers,
            'unlimited' => $maxUsers === 0 || $maxUsers === null,
            'percentage' => $maxUsers ? round(($currentUsers / $maxUsers) * 100, 2) : 0,
        ];
        
        // Workspace limit
        $maxWorkspaces = $subscription->getPlanLimit('max_workspaces');
        $currentWorkspaces = $tenant->workspaces()->count();
        $limits['workspaces'] = [
            'current' => $currentWorkspaces,
            'max' => $maxWorkspaces,
            'unlimited' => $maxWorkspaces === 0 || $maxWorkspaces === null,
            'percentage' => $maxWorkspaces ? round(($currentWorkspaces / $maxWorkspaces) * 100, 2) : 0,
        ];
        
        // Storage limit
        $maxStorageMb = $subscription->getPlanLimit('max_storage_mb');
        $currentStorageMb = self::getCurrentStorageUsage($tenant);
        $limits['storage'] = [
            'current' => round($currentStorageMb, 2),
            'max' => $maxStorageMb,
            'unlimited' => $maxStorageMb === 0 || $maxStorageMb === null,
            'percentage' => $maxStorageMb ? round(($currentStorageMb / $maxStorageMb) * 100, 2) : 0,
        ];
        
        // Features
        $features = $subscription->plan ? $subscription->plan->features ?? [] : [];
        $limits['features'] = $features;
        
        return [
            'has_subscription' => true,
            'subscription_status' => $subscription->status,
            'plan_name' => $subscription->plan ? $subscription->plan->name : null,
            'is_trial' => $subscription->isTrialing(),
            'trial_days_remaining' => $subscription->getTrialDaysRemaining(),
            'days_remaining' => $subscription->getDaysRemaining(),
            'limits' => $limits,
        ];
    }
    
    /**
     * Get current storage usage for a tenant.
     *
     * @param Tenant $tenant
     * @return float
     */
    public static function getCurrentStorageUsage(Tenant $tenant): float
    {
        $disk = Config::get('billing.limits.storage.disk', 'public');
        $pathPattern = Config::get('billing.limits.storage.path_pattern', 'tenant_{tenant}');
        $path = str_replace('{tenant}', $tenant->id, $pathPattern);
        
        try {
            $totalSize = 0;
            $files = Storage::disk($disk)->allFiles($path);
            
            foreach ($files as $file) {
                $totalSize += Storage::disk($disk)->size($file);
            }
            
            return $totalSize / (1024 * 1024); // Convert to MB
        } catch (\Exception $e) {
            Log::error('Failed to calculate storage usage', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
            
            return 0;
        }
    }
    
    /**
     * Log a subscription limit violation.
     *
     * @param Tenant $tenant
     * @param string $limitType
     * @param array $details
     * @return void
     */
    public static function logLimitViolation(Tenant $tenant, string $limitType, array $details = []): void
    {
        Log::warning('Subscription limit violation', [
            'tenant_id' => $tenant->id,
            'limit_type' => $limitType,
            'details' => $details,
            'timestamp' => now()->toISOString(),
        ]);
    }
    
    /**
     * Format a limit violation response.
     *
     * @param string $limitType
     * @param array $details
     * @return array
     */
    public static function formatLimitViolationResponse(string $limitType, array $details = []): array
    {
        $upgradeUrl = Config::get('billing.limits.upgrade_url', '/billing/plans');
        
        $baseResponse = [
            'error' => 'Subscription Limit Exceeded',
            'upgrade_url' => $upgradeUrl,
        ];
        
        switch ($limitType) {
            case 'users':
                return array_merge($baseResponse, [
                    'error' => 'User Limit Exceeded',
                    'message' => $details['message'] ?? "You have reached your plan's user limit.",
                ]);
                
            case 'workspaces':
                return array_merge($baseResponse, [
                    'error' => 'Workspace Limit Exceeded',
                    'message' => $details['message'] ?? "You have reached your plan's workspace limit.",
                ]);
                
            case 'storage':
                return array_merge($baseResponse, [
                    'error' => 'Storage Limit Exceeded',
                    'message' => $details['message'] ?? "You have reached your plan's storage limit.",
                ]);
                
            case 'feature':
                return array_merge($baseResponse, [
                    'error' => 'Feature Not Available',
                    'message' => $details['message'] ?? "This feature is not available in your current plan.",
                ]);
                
            default:
                return $baseResponse;
        }
    }
}