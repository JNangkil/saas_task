<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TaskPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Task $task): bool
    {
        // User can view tasks in workspaces they belong to
        return $task->workspace->users()->where('users.id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create tasks in a specific board.
     */
    public function createInBoard(User $user, $boardId): bool
    {
        $board = \App\Models\Board::find($boardId);
        if (!$board) {
            return false;
        }

        // User can create tasks in boards they can access
        return $board->workspace->users()->where('users.id', $user->id)->exists();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Task $task): bool
    {
        // User can update tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Task $task): bool
    {
        // User can delete tasks they created or can manage the workspace
        return $task->creator_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Task $task): bool
    {
        // User can restore tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Task $task): bool
    {
        // Only users who can manage the workspace can permanently delete tasks
        return $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can archive the model.
     */
    public function archive(User $user, Task $task): bool
    {
        // User can archive tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can duplicate the model.
     */
    public function duplicate(User $user, Task $task): bool
    {
        // User can duplicate tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can update the position of the model.
     */
    public function updatePosition(User $user, Task $task): bool
    {
        // User can update position of tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can manage comments on the model.
     */
    public function manageComments(User $user, Task $task): bool
    {
        // User can manage comments on tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can add comments to the model.
     */
    public function addComments(User $user, Task $task): bool
    {
        // User can add comments to tasks in workspaces they belong to
        return $task->workspace->users()->where('users.id', $user->id)->exists();
    }

    /**
     * Determine whether the user can manage custom values on the model.
     */
    public function manageCustomValues(User $user, Task $task): bool
    {
        // User can manage custom values on tasks they created or can manage the workspace
        return $task->creator_id === $user->id ||
               $task->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can manage labels on the model.
     */
    public function manageLabels(User $user, Task $task): bool
    {
        // User can manage labels on tasks they created, are assigned to, or can manage the workspace
        return $task->creator_id === $user->id || 
               $task->assignee_id === $user->id ||
               $task->workspace->canUserManage($user);
    }
}