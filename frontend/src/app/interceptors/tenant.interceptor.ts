import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkspaceContextService } from '../services/workspace-context.service';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
    constructor(private workspaceContextService: WorkspaceContextService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Add tenant context to headers
        const context = this.workspaceContextService.context;
        let headers = req.headers;

        if (context.currentTenant) {
            headers = headers.set('X-Tenant-ID', context.currentTenant.id);
        }

        // Add workspace context to headers if available
        if (context.currentWorkspace) {
            headers = headers.set('X-Workspace-ID', context.currentWorkspace.id);
        }

        // Clone the request with modified headers
        const authReq = req.clone({ headers });

        return next.handle(authReq).pipe(
            catchError(error => {
                console.error('HTTP Error:', error);

                // Handle tenant-related errors
                if (error.status === 403) {
                    const errorMessage = error.error?.message || 'Access denied';
                    this.workspaceContextService.setError(errorMessage);

                    // If tenant access denied, redirect to workspace selection
                    if (this.workspaceContextService.context.currentWorkspace) {
                        // Clear current workspace to force re-selection
                        this.workspaceContextService.setCurrentWorkspace(null);
                    }
                } else if (error.status === 404) {
                    // Handle workspace not found
                    const errorMessage = error.error?.message || 'Workspace not found';
                    this.workspaceContextService.setError(errorMessage);

                    // Clear current workspace if it doesn't exist
                    if (this.workspaceContextService.context.currentWorkspace) {
                        this.workspaceContextService.setCurrentWorkspace(null);
                    }
                } else if (error.status === 422) {
                    // Handle validation errors
                    const errorMessage = error.error?.message || 'Validation failed';
                    this.workspaceContextService.setError(errorMessage);
                }

                return throwError(() => error);
            })
        );
    }
}