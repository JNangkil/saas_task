<?php

namespace App\Enums;

use Illuminate\Support\Collection;

enum WorkspaceRole: string
{
    case OWNER = 'owner';
    case ADMIN = 'admin';
    case MEMBER = 'member';
    case VIEWER = 'viewer';

    /**
     * Get the display name for the role
     */
    public function getDisplayName(): string
    {
        return match($this) {
            self::OWNER => 'Owner',
            self::ADMIN => 'Admin',
            self::MEMBER => 'Member',
            self::VIEWER => 'Viewer',
        };
    }

    /**
     * Get the description for the role
     */
    public function getDescription(): string
    {
        return match($this) {
            self::OWNER => 'Full control over the workspace',
            self::ADMIN => 'Can manage most aspects of the workspace',
            self::MEMBER => 'Standard workspace participant',
            self::VIEWER => 'Read-only access to workspace content',
        };
    }

    /**
     * Get the weight/hierarchy level for the role
     */
    public function getWeight(): int
    {
        return match($this) {
            self::OWNER => 100,
            self::ADMIN => 80,
            self::MEMBER => 50,
            self::VIEWER => 20,
        };
    }

    /**
     * Get all permissions for this role
     */
    public function getPermissions(): Collection
    {
        $config = config('workspace_permissions.roles');
        $roleConfig = $this->value;

        return collect($config[$roleConfig]['permissions'] ?? []);
    }

    /**
     * Check if the role has a specific permission
     */
    public function hasPermission(string $permission): bool
    {
        return $this->getPermissions()->contains($permission);
    }

    /**
     * Check if this role can manage the given role
     */
    public function canManageRole(self $otherRole): bool
    {
        return $this->getWeight() > $otherRole->getWeight();
    }

    /**
     * Get all available roles ordered by weight
     */
    public static function getAllOrdered(): Collection
    {
        return collect(self::cases())
            ->sortByDesc(fn($role) => $role->getWeight())
            ->values();
    }

    /**
     * Get roles that this role can assign to others
     */
    public function getAssignableRoles(): Collection
    {
        return self::getAllOrdered()
            ->filter(fn($role) => $this->canManageRole($role) || $this === $role);
    }

    /**
     * Check if this is the highest level role (Owner)
     */
    public function isOwner(): bool
    {
        return $this === self::OWNER;
    }

    /**
     * Check if this is an admin-level role or higher
     */
    public function isAdminOrAbove(): bool
    {
        return $this->getWeight() >= self::ADMIN->getWeight();
    }

    /**
     * Check if this role can invite members
     */
    public function canInviteMembers(): bool
    {
        return $this->hasPermission('members.invite');
    }

    /**
     * Check if this role can manage boards
     */
    public function canManageBoards(): bool
    {
        return $this->hasPermission('boards.manage');
    }

    /**
     * Check if this role can create tasks
     */
    public function canCreateTasks(): bool
    {
        return $this->hasPermission('tasks.create');
    }

    /**
     * Check if this role can delete tasks
     */
    public function canDeleteTasks(): bool
    {
        return $this->hasPermission('tasks.delete');
    }

    /**
     * Check if this role can view analytics
     */
    public function canViewAnalytics(): bool
    {
        return $this->hasPermission('analytics.view');
    }

    /**
     * Get the default role for new members
     */
    public static function getDefault(): self
    {
        return self::MEMBER;
    }

    /**
     * Validate if a string is a valid role
     */
    public static function isValid(string $value): bool
    {
        return in_array($value, array_column(self::cases(), 'value'));
    }

    /**
     * Get role from string, throw exception if invalid
     */
    public static function fromString(string $value): self
    {
        if (!self::isValid($value)) {
            throw new \InvalidArgumentException("Invalid workspace role: {$value}");
        }

        return self::from($value);
    }
}