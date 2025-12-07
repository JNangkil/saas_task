import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkspaceContextService } from '../services/workspace-context.service';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
    constructor(private workspaceContextService: WorkspaceContextService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Clone the request to modify it
        const authReq = req.clone();

        // Add tenant context to headers
        const context = this.workspaceContextService.context;
        if (context.currentTenant) {
            authReq.headers = authReq.headers.set('X-Tenant-ID', context.currentTenant.id);
        }

        // Add workspace context to headers if available
        if (context.currentWorkspace) {
            authReq.headers = authReq.headers.set('X-Workspace-ID', context.currentWorkspace.id);
        }

        return next.handle(authReq).pipe(
            catchError(error => {
                console.error('HTTP Error:', error);

                // Handle tenant-related errors
                if (error.status === 403) {
                    const errorMessage = error.error?.message || 'Access denied';
                    this.workspaceContextService.setError(errorMessage);
                }

                return throwError(() => error);
            })
        );
    }
}