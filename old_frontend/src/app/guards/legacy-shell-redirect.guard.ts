import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const legacyShellRedirectGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const workspaceId = route.paramMap.get('workspaceId');
    const boardId = route.paramMap.get('boardId');

    if (workspaceId && boardId && route.routeConfig?.path?.endsWith('settings')) {
        return router.createUrlTree(['/app', workspaceId, 'boards', boardId, 'settings'], {
            queryParams: route.queryParams
        });
    }

    if (workspaceId && boardId) {
        return router.createUrlTree(['/app', workspaceId, 'boards', boardId], {
            queryParams: route.queryParams
        });
    }

    if (workspaceId) {
        return router.createUrlTree(['/app', workspaceId], {
            queryParams: route.queryParams
        });
    }

    return router.createUrlTree(['/app'], {
        queryParams: route.queryParams
    });
};
