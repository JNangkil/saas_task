import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TaskTableComponent, TaskTableConfig, TaskColumn } from '../task-table/task-table.component';
import { Task, TaskFilters } from '../../models';
import { WorkspaceContextService } from '../../services/workspace-context.service';

/**
 * TaskTableExampleComponent - Example usage of TaskTableComponent
 * 
 * This component demonstrates how to use the TaskTableComponent with:
 * - Basic configuration
 * - Event handling
 * - Custom filters
 * - Integration with workspace context
 */
@Component({
    selector: 'app-task-table-example',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TaskTableComponent
    ],
    templateUrl: './task-table-example.component.html',
    styleUrls: ['./task-table-example.component.css']
})
export class TaskTableExampleComponent implements OnInit {
    // Sample configuration for the task table
    tableConfig: Partial<TaskTableConfig> = {
        pageSize: 20,
        showPagination: true,
        showFilters: true,
        showColumnToggles: true,
        allowRowSelection: true
    };

    // Sample initial filters
    initialFilters: TaskFilters = {
        status: ['todo', 'in_progress']
    };

    // Sample data for demonstration
    selectedTasks: Task[] = [];
    currentTask: Task | null = null;

    constructor(private workspaceContextService: WorkspaceContextService) { }

    ngOnInit(): void {
        // Component initialization logic can go here
        console.log('TaskTableExampleComponent initialized');
    }

    /**
     * Handle task selection
     */
    onTaskSelected(task: Task): void {
        this.currentTask = task;
        console.log('Task selected:', task);
    }

    /**
     * Handle multiple task selection
     */
    onTasksSelected(tasks: Task[]): void {
        this.selectedTasks = tasks;
        console.log('Tasks selected:', tasks);
    }

    /**
     * Handle task double click
     */
    onTaskDoubleClicked(task: Task): void {
        console.log('Task double clicked:', task);
        // Navigate to task details or open modal
    }

    /**
     * Get workspace context for display
     */
    get workspaceInfo() {
        return this.workspaceContextService.context;
    }

    /**
     * Check if any tasks are selected
     */
    get hasSelectedTasks(): boolean {
        return this.selectedTasks.length > 0;
    }

    /**
     * Get count of selected tasks
     */
    get selectedTasksCount(): number {
        return this.selectedTasks.length;
    }

    /**
     * Example action methods
     */
    onMarkAsComplete(): void {
        console.log('Marking tasks as complete:', this.selectedTasks);
        // Implement bulk update logic here
    }

    onDeleteSelected(): void {
        console.log('Deleting selected tasks:', this.selectedTasks);
        // Implement bulk delete logic here
    }

    onAssignToUser(): void {
        console.log('Assigning tasks to user:', this.selectedTasks);
        // Implement bulk assign logic here
    }
}