<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Subscription;
use App\Models\Plan;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Exception;

class LimitService
{
    /**
     * Check if a tenant can add more users.
     *
     * @param Tenant $tenant
     * @param int $additionalUsers
     * @return array
     */
    public function canAddUsers(Tenant $tenant, int $additionalUsers = 1): array
    {
        $subscription = $this->getActiveSubscription($tenant);

        if (!$subscription) {
            return [
                'allowed' => false,
                'message' => 'No active subscription found',
                'current' => 0,
                'limit' => 0,
                'requested' => $additionalUsers,
            ];
        }

        $plan = $subscription->plan;
        $maxUsers = $plan->getMaxUsersAttribute();

        // Unlimited users
        if ($maxUsers === -1) {
            return [
                'allowed' => true,
                'message' => 'Unlimited users allowed',
                'current' => $tenant->users()->count(),
                'limit' => -1,
                'requested' => $additionalUsers,
            ];
        }

        $currentUserCount = $tenant->users()->count();
        $newTotal = $currentUserCount + $additionalUsers;
        $availableSlots = max(0, $maxUsers - $currentUserCount);

        return [
            'allowed' => $newTotal <= $maxUsers,
            'message' => $newTotal <= $maxUsers
                ? "Can add {$additionalUsers} user(s)"
                : "Cannot add {$additionalUsers} user(s). Only {$availableSlots} slot(s) available.",
            'current' => $currentUserCount,
            'limit' => $maxUsers,
            'requested' => $additionalUsers,
            'available' => $availableSlots,
        ];
    }

    /**
     * Check if a tenant can create more workspaces.
     *
     * @param Tenant $tenant
     * @param int $additionalWorkspaces
     * @return array
     */
    public function canCreateWorkspaces(Tenant $tenant, int $additionalWorkspaces = 1): array
    {
        $subscription = $this->getActiveSubscription($tenant);

        if (!$subscription) {
            return [
                'allowed' => false,
                'message' => 'No active subscription found',
                'current' => 0,
                'limit' => 0,
                'requested' => $additionalWorkspaces,
            ];
        }

        $plan = $subscription->plan;
        $maxWorkspaces = $plan->getMaxWorkspacesAttribute();

        // Unlimited workspaces
        if ($maxWorkspaces === -1) {
            return [
                'allowed' => true,
                'message' => 'Unlimited workspaces allowed',
                'current' => $tenant->workspaces()->count(),
                'limit' => -1,
                'requested' => $additionalWorkspaces,
            ];
        }

        $currentWorkspaceCount = $tenant->workspaces()->count();
        $newTotal = $currentWorkspaceCount + $additionalWorkspaces;
        $availableSlots = max(0, $maxWorkspaces - $currentWorkspaceCount);

        return [
            'allowed' => $newTotal <= $maxWorkspaces,
            'message' => $newTotal <= $maxWorkspaces
                ? "Can create {$additionalWorkspaces} workspace(s)"
                : "Cannot create {$additionalWorkspaces} workspace(s). Only {$availableSlots} slot(s) available.",
            'current' => $currentWorkspaceCount,
            'limit' => $maxWorkspaces,
            'requested' => $additionalWorkspaces,
            'available' => $availableSlots,
        ];
    }

    /**
     * Check if a workspace can create more boards.
     *
     * @param Workspace $workspace
     * @param int $additionalBoards
     * @return array
     */
    public function canCreateBoards(Workspace $workspace, int $additionalBoards = 1): array
    {
        $tenant = $workspace->tenant;
        $subscription = $this->getActiveSubscription($tenant);

        if (!$subscription) {
            return [
                'allowed' => false,
                'message' => 'No active subscription found',
                'current' => 0,
                'limit' => 0,
                'requested' => $additionalBoards,
            ];
        }

        $plan = $subscription->plan;
        $maxBoards = $plan->getMaxBoardsAttribute();

        // Unlimited boards
        if ($maxBoards === -1) {
            return [
                'allowed' => true,
                'message' => 'Unlimited boards allowed',
                'current' => $workspace->boards()->count(),
                'limit' => -1,
                'requested' => $additionalBoards,
            ];
        }

        $currentBoardCount = $workspace->boards()->count();
        $newTotal = $currentBoardCount + $additionalBoards;
        $availableSlots = max(0, $maxBoards - $currentBoardCount);

        return [
            'allowed' => $newTotal <= $maxBoards,
            'message' => $newTotal <= $maxBoards
                ? "Can create {$additionalBoards} board(s)"
                : "Cannot create {$additionalBoards} board(s). Only {$availableSlots} slot(s) available.",
            'current' => $currentBoardCount,
            'limit' => $maxBoards,
            'requested' => $additionalBoards,
            'available' => $availableSlots,
        ];
    }

    /**
     * Check if a tenant can upload more storage.
     *
     * @param Tenant $tenant
     * @param int|UploadedFile $fileSizeOrFile
     * @return array
     */
    public function canUploadStorage(Tenant $tenant, int|UploadedFile $fileSizeOrFile): array
    {
        $subscription = $this->getActiveSubscription($tenant);

        if (!$subscription) {
            return [
                'allowed' => false,
                'message' => 'No active subscription found',
                'current' => 0,
                'limit' => 0,
                'requested' => 0,
            ];
        }

        $plan = $subscription->plan;
        $maxStorageMb = $plan->getMaxStorageMbAttribute();

        // Unlimited storage
        if ($maxStorageMb === -1) {
            return [
                'allowed' => true,
                'message' => 'Unlimited storage allowed',
                'current' => $this->getCurrentStorageUsage($tenant),
                'limit' => -1,
                'requested' => $this->getFileSizeInMb($fileSizeOrFile),
            ];
        }

        $currentUsageMb = $this->getCurrentStorageUsage($tenant);
        $requestedSizeMb = $this->getFileSizeInMb($fileSizeOrFile);
        $newTotal = $currentUsageMb + $requestedSizeMb;
        $availableSpace = max(0, $maxStorageMb - $currentUsageMb);

        return [
            'allowed' => $newTotal <= $maxStorageMb,
            'message' => $newTotal <= $maxStorageMb
                ? "Can upload {$requestedSizeMb} MB"
                : "Cannot upload {$requestedSizeMb} MB. Only {$availableSpace} MB available.",
            'current' => $currentUsageMb,
            'limit' => $maxStorageMb,
            'requested' => $requestedSizeMb,
            'available' => $availableSpace,
        ];
    }

    /**
     * Check if a tenant has access to a specific feature.
     *
     * @param Tenant $tenant
     * @param string $feature
     * @return bool
     */
    public function hasFeature(Tenant $tenant, string $feature): bool
    {
        $subscription = $this->getActiveSubscription($tenant);

        if (!$subscription) {
            return false;
        }

        return $subscription->plan->hasFeature($feature);
    }

    /**
     * Get current usage statistics for a tenant.
     *
     * @param Tenant $tenant
     * @return array
     */
    public function getCurrentUsage(Tenant $tenant): array
    {
        $subscription = $this->getActiveSubscription($tenant);
        $plan = $subscription?->plan;

        return [
            'users' => [
                'current' => $tenant->users()->count(),
                'limit' => $plan?->getMaxUsersAttribute() ?? 0,
                'percentage' => $plan && $plan->getMaxUsersAttribute() > 0
                    ? ($tenant->users()->count() / $plan->getMaxUsersAttribute()) * 100
                    : 0,
            ],
            'workspaces' => [
                'current' => $tenant->workspaces()->count(),
                'limit' => $plan?->getMaxWorkspacesAttribute() ?? 0,
                'percentage' => $plan && $plan->getMaxWorkspacesAttribute() > 0
                    ? ($tenant->workspaces()->count() / $plan->getMaxWorkspacesAttribute()) * 100
                    : 0,
            ],
            'storage' => [
                'current' => $this->getCurrentStorageUsage($tenant),
                'limit' => $plan?->getMaxStorageMbAttribute() ?? 0,
                'percentage' => $plan && $plan->getMaxStorageMbAttribute() > 0
                    ? ($this->getCurrentStorageUsage($tenant) / $plan->getMaxStorageMbAttribute()) * 100
                    : 0,
            ],
            'features' => $plan?->features ?? [],
        ];
    }

    /**
     * Get a list of limits that are near or exceeded.
     *
     * @param Tenant $tenant
     * @param float $warningThreshold Percentage (e.g., 0.8 for 80%)
     * @return array
     */
    public function getLimitWarnings(Tenant $tenant, float $warningThreshold = 0.8): array
    {
        $warnings = [];
        $usage = $this->getCurrentUsage($tenant);

        foreach (['users', 'workspaces', 'storage'] as $resource) {
            $limit = $usage[$resource]['limit'];

            // Skip unlimited resources
            if ($limit === -1 || $limit === 0) {
                continue;
            }

            $current = $usage[$resource]['current'];
            $percentage = $usage[$resource]['percentage'];

            if ($current >= $limit) {
                $warnings[] = [
                    'type' => 'exceeded',
                    'resource' => $resource,
                    'message' => ucfirst($resource) . " limit exceeded ({$current}/{$limit})",
                    'severity' => 'error',
                ];
            } elseif ($percentage >= ($warningThreshold * 100)) {
                $warnings[] = [
                    'type' => 'warning',
                    'resource' => $resource,
                    'message' => ucfirst($resource) . " limit nearly reached ({$current}/{$limit})",
                    'severity' => 'warning',
                ];
            }
        }

        return $warnings;
    }

    /**
     * Get the active subscription for a tenant.
     *
     * @param Tenant $tenant
     * @return Subscription|null
     */
    private function getActiveSubscription(Tenant $tenant): ?Subscription
    {
        return $tenant->subscriptions()
            ->whereIn('status', [
                Subscription::STATUS_ACTIVE,
                Subscription::STATUS_TRIALING,
                Subscription::STATUS_PAST_DUE,
            ])
            ->with('plan')
            ->first();
    }

    /**
     * Get current storage usage in MB for a tenant.
     *
     * @param Tenant $tenant
     * @return float
     */
    private function getCurrentStorageUsage(Tenant $tenant): float
    {
        // This is a simplified implementation
        // In a real application, you would aggregate the actual file sizes
        // from your storage system for this tenant

        try {
            $disk = Storage::disk('public');
            $tenantPath = "tenant-{$tenant->id}";

            if (!$disk->exists($tenantPath)) {
                return 0;
            }

            // This is a rough estimation - for production, consider
            // using a more efficient method like database tracking
            $size = 0;
            $files = $disk->allFiles($tenantPath);

            foreach ($files as $file) {
                $size += $disk->size($file);
            }

            return round($size / 1024 / 1024, 2); // Convert bytes to MB
        } catch (Exception $e) {
            // Log error and return 0
            \Log::error('Failed to calculate storage usage', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return 0;
        }
    }

    /**
     * Get file size in MB from either an integer or UploadedFile.
     *
     * @param int|UploadedFile $fileSizeOrFile
     * @return float
     */
    private function getFileSizeInMb(int|UploadedFile $fileSizeOrFile): float
    {
        if ($fileSizeOrFile instanceof UploadedFile) {
            return round($fileSizeOrFile->getSize() / 1024 / 1024, 2);
        }

        return round($fileSizeOrFile / 1024 / 1024, 2);
    }

    /**
     * Throw an exception if a limit would be exceeded.
     *
     * @param Tenant $tenant
     * @param string $limitType
     * @param mixed ...$args
     * @return void
     * @throws Exception
     */
    public function enforceLimit(Tenant $tenant, string $limitType, ...$args): void
    {
        $check = match($limitType) {
            'users' => $this->canAddUsers($tenant, $args[0] ?? 1),
            'workspaces' => $this->canCreateWorkspaces($tenant, $args[0] ?? 1),
            'boards' => $this->canCreateBoards($args[0] ?? null, $args[1] ?? 1),
            'storage' => $this->canUploadStorage($tenant, $args[0] ?? 0),
            'feature' => [
                'allowed' => $this->hasFeature($tenant, $args[0] ?? ''),
                'message' => "Feature '{$args[0]}' is not available on your current plan",
            ],
            default => ['allowed' => true, 'message' => 'Unknown limit type'],
        };

        if (!$check['allowed']) {
            throw new Exception($check['message']);
        }
    }

    /**
     * Check if tenant can perform an action based on subscription state.
     *
     * @param Tenant $tenant
     * @param string $action
     * @return array
     */
    public function canPerformAction(Tenant $tenant, string $action): array
    {
        $subscription = $this->getActiveSubscription($tenant);

        if (!$subscription) {
            return [
                'allowed' => false,
                'message' => 'No active subscription found',
                'reason' => 'no_subscription',
            ];
        }

        // Define restricted actions for different states
        $restrictedActions = [
            Subscription::STATUS_PAST_DUE => [
                'invite_users',
                'create_workspaces',
                'upload_files',
            ],
            Subscription::STATUS_CANCELED => [
                'invite_users',
                'create_workspaces',
                'upload_files',
                'upgrade_plan',
            ],
            Subscription::STATUS_EXPIRED => [
                'invite_users',
                'create_workspaces',
                'upload_files',
                'access_data',
            ],
        ];

        $restricted = $restrictedActions[$subscription->status] ?? [];

        if (in_array($action, $restricted)) {
            return [
                'allowed' => false,
                'message' => "Action '{$action}' is not allowed in subscription status '{$subscription->status}'",
                'reason' => 'subscription_status',
                'status' => $subscription->status,
            ];
        }

        return [
            'allowed' => true,
            'message' => 'Action allowed',
        ];
    }
}