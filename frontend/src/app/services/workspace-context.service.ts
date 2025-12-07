import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { IWorkspace, IWorkspaceContext, ITenant } from '../interfaces/workspace.interface';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceContextService {
    private contextSubject = new BehaviorSubject<IWorkspaceContext>({
        currentTenant: null,
        currentWorkspace: null,
        userTenants: [],
        userWorkspaces: [],
        isLoading: false,
        error: null
    });

    private readonly localStorageKey = 'lastWorkspaceId';

    constructor() {
        // Initialize from localStorage
        const lastWorkspaceId = localStorage.getItem(this.localStorageKey);
        if (lastWorkspaceId) {
            // This would be populated from user's workspaces
            // For now, we'll set it as null and let the workspace service handle it
            this.contextSubject.next({
                ...this.contextSubject.value,
                currentWorkspace: { id: lastWorkspaceId } as IWorkspace
            });
        }
    }

    /**
     * Get the current workspace context as an observable.
     */
    get context$(): Observable<IWorkspaceContext> {
        return this.contextSubject.asObservable();
    }

    /**
     * Get the current context value.
     */
    get context(): IWorkspaceContext {
        return this.contextSubject.value;
    }

    /**
     * Set the current tenant.
     */
    setCurrentTenant(tenant: ITenant): void {
        this.contextSubject.next({
            ...this.contextSubject.value,
            currentTenant: tenant
        });
    }

    /**
     * Set the current workspace.
     */
    setCurrentWorkspace(workspace: IWorkspace): void {
        localStorage.setItem(this.localStorageKey, workspace.id);

        this.contextSubject.next({
            ...this.contextSubject.value,
            currentWorkspace: workspace
        });
    }

    /**
     * Set the user's tenants.
     */
    setUserTenants(tenants: ITenant[]): void {
        this.contextSubject.next({
            ...this.contextSubject.value,
            userTenants: tenants
        });
    }

    /**
     * Set the user's workspaces.
     */
    setUserWorkspaces(workspaces: IWorkspace[]): void {
        this.contextSubject.next({
            ...this.contextSubject.value,
            userWorkspaces: workspaces
        });
    }

    /**
     * Set loading state.
     */
    setLoading(isLoading: boolean): void {
        this.contextSubject.next({
            ...this.contextSubject.value,
            isLoading
        });
    }

    /**
     * Set error state.
     */
    setError(error: string | null): void {
        this.contextSubject.next({
            ...this.contextSubject.value,
            error
        });
    }

    /**
     * Clear the error state.
     */
    clearError(): void {
        this.contextSubject.next({
            ...this.contextSubject.value,
            error: null
        });
    }

    /**
     * Refresh the workspace context.
     */
    refresh(): void {
        // This would typically fetch fresh data from the API
        // For now, just emit the current value
        this.contextSubject.next(this.contextSubject.value);
    }

    /**
     * Reset the entire context.
     */
    reset(): void {
        this.contextSubject.next({
            currentTenant: null,
            currentWorkspace: null,
            userTenants: [],
            userWorkspaces: [],
            isLoading: false,
            error: null
        });

        localStorage.removeItem(this.localStorageKey);
    }
}