<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;
use App\Models\User;

class AssigneeFilter extends BaseFilter
{
    /**
     * Get the supported operators for this filter
     *
     * @return array
     */
    public function getSupportedOperators(): array
    {
        return [
            'equals',
            'not_equals',
            'in',
            'not_in',
            'is_empty',
            'is_not_empty',
        ];
    }

    /**
     * Apply the specific filter logic for assignee columns
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        // For dynamic columns (TaskFieldValue), use JSON filtering
        if ($column === 'task_field_values.value') {
            return $this->applyJsonFilter($query, $column, $value, $operator);
        }

        // For standard assignee columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for assignee filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For assignee operators, validate based on operator type
        if (in_array($operator, ['in', 'not_in'])) {
            // Value should be an array for in/not_in operators
            if (!is_array($value)) {
                return false;
            }

            // Check each value in the array
            foreach ($value as $assigneeId) {
                if (!is_numeric($assigneeId) && !is_string($assigneeId)) {
                    return false;
                }

                // Check if user exists (for validation purposes)
                if (!$this->userExists($assigneeId)) {
                    return false;
                }
            }

            // Limit to reasonable number of assignees
            if (count($value) > 50) {
                return false;
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            // For single value operators, value should be a valid user ID
            if (!is_numeric($value) && !is_string($value)) {
                return false;
            }

            if (!$this->userExists($value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for assignee filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                return 'Assignee filter value must be an array for ' . $operator . ' operator.';
            }

            if (count($value) > 50) {
                return 'Assignee filter array cannot contain more than 50 values.';
            }

            foreach ($value as $assigneeId) {
                if (!is_numeric($assigneeId) && !is_string($assigneeId)) {
                    return 'All assignee values must be valid user IDs.';
                }
                if (!$this->userExists($assigneeId)) {
                    return "User with ID {$assigneeId} does not exist.";
                }
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_numeric($value) && !is_string($value)) {
                return 'Assignee filter value must be a valid user ID.';
            }
            if (!$this->userExists($value)) {
                return "User with ID {$value} does not exist.";
            }
        }

        return 'Invalid assignee filter value.';
    }

    /**
     * Check if a user exists
     *
     * @param mixed $userId
     * @return bool
     */
    protected function userExists(mixed $userId): bool
    {
        // For performance, we'll do a simple existence check
        // In a real implementation, you might want to cache this or use a different approach
        return User::where('id', $userId)->exists();
    }

    /**
     * Apply JSON filter specifically for assignee columns
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyJsonFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        $jsonPath = "$.value"; // JSON path for TaskFieldValue value column

        return match ($operator) {
            'equals' => $query->whereJsonPath($column, $jsonPath, '=', $value),
            'not_equals' => $query->whereJsonPath($column, $jsonPath, '!=', $value),
            'in' => $query->whereJsonPath($column, $jsonPath, 'in', $value),
            'not_in' => $query->whereJsonPath($column, $jsonPath, 'not in', $value),
            'is_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '=', null)
                  ->orWhereJsonPath($column, $jsonPath, '=', '')
                  ->orWhereJsonPath($column, $jsonPath, '=', 0)
                  ->orWhereNull($column);
            }),
            'is_not_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '!=', null)
                  ->whereJsonPath($column, $jsonPath, '!=', '')
                  ->whereJsonPath($column, $jsonPath, '!=', 0)
                  ->whereNotNull($column);
            }),
            default => $query,
        };
    }

    /**
     * Apply filter for current user (assigned to me)
     *
     * @param Builder $query
     * @param string $column
     * @param int $currentUserId
     * @return Builder
     */
    public function applyCurrentUserFilter(Builder $query, string $column, int $currentUserId): Builder
    {
        if ($column === 'task_field_values.value') {
            return $query->whereJsonPath($column, '$.value', '=', $currentUserId);
        } else {
            return $query->where($column, '=', $currentUserId);
        }
    }

    /**
     * Apply filter for unassigned tasks
     *
     * @param Builder $query
     * @param string $column
     * @return Builder
     */
    public function applyUnassignedFilter(Builder $query, string $column): Builder
    {
        if ($column === 'task_field_values.value') {
            return $query->where(function ($q) use ($column) {
                $q->whereJsonPath($column, '$.value', '=', null)
                  ->orWhereJsonPath($column, '$.value', '=', '')
                  ->orWhereJsonPath($column, '$.value', '=', 0)
                  ->orWhereNull($column);
            });
        } else {
            return $query->whereNull($column)
                        ->orWhere($column, '=', '')
                        ->orWhere($column, '=', 0);
        }
    }

    /**
     * Apply filter for tasks assigned to users in a specific role
     *
     * @param Builder $query
     * @param string $column
     * @param string $role
     * @return Builder
     */
    public function applyRoleFilter(Builder $query, string $column, string $role): Builder
    {
        // Get user IDs with the specified role
        $userIds = User::whereHas('roles', function ($q) use ($role) {
            $q->where('name', $role);
        })->pluck('id')->toArray();

        if (empty($userIds)) {
            // If no users have this role, return no results
            return $query->whereRaw('1 = 0');
        }

        if ($column === 'task_field_values.value') {
            return $query->whereJsonPath($column, '$.value', 'in', $userIds);
        } else {
            return $query->whereIn($column, $userIds);
        }
    }

    /**
     * Get user information for filtering options
     *
     * @param array $userIds
     * @return array
     */
    public function getUserOptions(array $userIds = []): array
    {
        $query = User::select('id', 'name', 'email', 'avatar');

        if (!empty($userIds)) {
            $query->whereIn('id', $userIds);
        }

        return $query->orderBy('name')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'display_name' => $user->name . ' (' . $user->email . ')',
            ];
        })->toArray();
    }
}