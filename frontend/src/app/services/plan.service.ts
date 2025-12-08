import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import {
    IPlan,
    IPlanComparison,
    IPlanFilter,
    ICurrentSubscription,
    IFeaturesListResponse,
    IPlanFeature,
    IPlanLimits,
    IPlanUsage,
    IPlanLimitUsage
} from '../models/plan.model';

/**
 * PlanService handles all plan-related operations including fetching,
 * filtering, comparing, and caching plan data.
 */
@Injectable({
    providedIn: 'root'
})
export class PlanService {
    private readonly apiUrl = '/api/plans';
    private readonly httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json'
        })
    };

    // Cache for public plan data to improve performance
    private plansCache = new Map<string, { data: IPlan[]; timestamp: number }>();
    private planCache = new Map<string, { data: IPlan; timestamp: number }>();
    private featuresCache = new Map<string, { data: IFeaturesListResponse; timestamp: number }>();
    private comparisonCache = new Map<string, { data: IPlanComparison; timestamp: number }>();

    // Cache duration in milliseconds (1 hour)
    private readonly cacheDuration = 3600000;

    // BehaviorSubject for current plan state
    private currentPlanSubject = new BehaviorSubject<ICurrentSubscription | null>(null);
    public currentPlan$ = this.currentPlanSubject.asObservable();

    constructor(private http: HttpClient) { }

    /**
     * Get all available plans with optional filtering.
     * 
     * @param filters Optional filters to apply to the plans
     * @returns Observable<IPlan[]> Array of plans
     */
    getAllPlans(filters?: IPlanFilter): Observable<IPlan[]> {
        const cacheKey = this.generateCacheKey('plans', filters);
        const cached = this.getCachedData(this.plansCache, cacheKey);

        if (cached) {
            return of(cached);
        }

        const params = this.buildQueryParams(filters);
        const url = params ? `${this.apiUrl}?${params}` : this.apiUrl;

        return this.http.get<any>(url).pipe(
            map(response => response.data || []),
            tap(plans => this.setCachedData(this.plansCache, cacheKey, plans)),
            catchError(error => this.handleError('Failed to fetch plans', error))
        );
    }

    /**
     * Get a specific plan by its slug.
     * 
     * @param slug The plan slug to fetch
     * @returns Observable<IPlan> The requested plan
     */
    getPlanBySlug(slug: string): Observable<IPlan> {
        const cacheKey = `plan:${slug}`;
        const cached = this.getCachedData(this.planCache, cacheKey);

        if (cached) {
            return of(cached);
        }

        return this.http.get<any>(`${this.apiUrl}/${slug}`).pipe(
            map(response => response.data),
            tap(plan => this.setCachedData(this.planCache, cacheKey, plan)),
            catchError(error => this.handleError(`Failed to fetch plan: ${slug}`, error))
        );
    }

    /**
     * Compare multiple plans side by side.
     * 
     * @param planSlugs Array of plan slugs to compare
     * @param features Optional specific features to highlight
     * @returns Observable<IPlanComparison> Plan comparison data
     */
    comparePlans(planSlugs: string[], features?: string[]): Observable<IPlanComparison> {
        if (planSlugs.length < 2) {
            return throwError(() => new Error('At least 2 plans are required for comparison'));
        }

        if (planSlugs.length > 5) {
            return throwError(() => new Error('Cannot compare more than 5 plans at once'));
        }

        const cacheKey = `compare:${planSlugs.join(',')}:${features?.join(',') || ''}`;
        const cached = this.getCachedData(this.comparisonCache, cacheKey);

        if (cached) {
            return of(cached);
        }

        const params = new URLSearchParams();
        params.append('slugs', planSlugs.join(','));
        if (features) {
            params.append('features', features.join(','));
        }

        return this.http.get<any>(`${this.apiUrl}/compare?${params.toString()}`).pipe(
            map(response => response.data),
            tap(comparison => this.setCachedData(this.comparisonCache, cacheKey, comparison)),
            catchError(error => this.handleError('Failed to compare plans', error))
        );
    }

    /**
     * Get the current tenant's plan and subscription information.
     * 
     * @returns Observable<ICurrentSubscription> Current subscription data
     */
    getCurrentPlan(): Observable<ICurrentSubscription> {
        return this.http.get<any>(`${this.apiUrl}/current`).pipe(
            map(response => response.data),
            tap(subscription => this.currentPlanSubject.next(subscription)),
            catchError(error => this.handleError('Failed to fetch current plan', error))
        );
    }

    /**
     * Get all available features across all plans.
     * 
     * @param category Optional category filter
     * @returns Observable<IFeaturesListResponse> List of all features
     */
    getAllFeatures(category?: string): Observable<IFeaturesListResponse> {
        const cacheKey = `features:${category || 'all'}`;
        const cached = this.getCachedData(this.featuresCache, cacheKey);

        if (cached) {
            return of(cached);
        }

        const url = category ? `${this.apiUrl}/features?category=${category}` : `${this.apiUrl}/features`;

        return this.http.get<any>(url).pipe(
            map(response => response.data),
            tap(features => this.setCachedData(this.featuresCache, cacheKey, features)),
            catchError(error => this.handleError('Failed to fetch features', error))
        );
    }

    /**
     * Get plans marked as popular.
     * 
     * @returns Observable<IPlan[]> Array of popular plans
     */
    getPopularPlans(): Observable<IPlan[]> {
        return this.getAllPlans({ featured: true }).pipe(
            catchError(error => this.handleError('Failed to fetch popular plans', error))
        );
    }

    /**
     * Filter plans based on various criteria.
     * 
     * @param filters Filter criteria
     * @returns Observable<IPlan[]> Filtered array of plans
     */
    filterPlans(filters: IPlanFilter): Observable<IPlan[]> {
        return this.getAllPlans(filters).pipe(
            catchError(error => this.handleError('Failed to filter plans', error))
        );
    }

    /**
     * Get usage statistics for the current plan.
     * 
     * @returns Observable<IPlanUsage> Current usage data
     */
    getPlanUsage(): Observable<IPlanUsage> {
        return this.getCurrentPlan().pipe(
            map(subscription => subscription.usage || {
                users: 0,
                workspaces: 0,
                boards: 0
            }),
            catchError(error => this.handleError('Failed to fetch plan usage', error))
        );
    }

    /**
     * Get detailed limit usage comparison for the current plan.
     * 
     * @returns Observable<IPlanLimitUsage[]> Array of limit usage data
     */
    getLimitUsage(): Observable<IPlanLimitUsage[]> {
        return this.getCurrentPlan().pipe(
            map(subscription => {
                if (!subscription.plan || !subscription.usage) {
                    return [];
                }

                const limits: IPlanLimitUsage[] = [];
                const planLimits = subscription.plan.limits;
                const usage = subscription.usage;

                // Calculate usage for each limit
                Object.keys(planLimits).forEach(key => {
                    const limitValue = planLimits[key];
                    if (limitValue === undefined) return;

                    const currentUsage = (usage as any)[key] || 0;
                    const isUnlimited = limitValue === -1;
                    const usagePercentage = isUnlimited ? 0 : (currentUsage / limitValue) * 100;
                    const remaining = isUnlimited ? -1 : Math.max(0, limitValue - currentUsage);

                    limits.push({
                        limit_name: key,
                        limit_value: limitValue,
                        current_usage: currentUsage,
                        usage_percentage: Math.round(usagePercentage * 100) / 100,
                        is_unlimited: isUnlimited,
                        is_over_limit: !isUnlimited && currentUsage > limitValue,
                        remaining: remaining
                    });
                });

                return limits;
            }),
            catchError(error => this.handleError('Failed to fetch limit usage', error))
        );
    }

    /**
     * Check if a specific feature is available in the current plan.
     * 
     * @param feature The feature to check
     * @returns Observable<boolean> Whether the feature is available
     */
    hasFeature(feature: string): Observable<boolean> {
        return this.getCurrentPlan().pipe(
            map(subscription => {
                if (!subscription.plan) {
                    return false;
                }
                return subscription.plan.features.includes(feature);
            }),
            catchError(error => this.handleError('Failed to check feature availability', error))
        );
    }

    /**
     * Get plans by billing interval.
     * 
     * @param interval The billing interval ('month' or 'year')
     * @returns Observable<IPlan[]> Array of plans for the interval
     */
    getPlansByInterval(interval: 'month' | 'year'): Observable<IPlan[]> {
        return this.getAllPlans({ interval }).pipe(
            catchError(error => this.handleError(`Failed to fetch ${interval}ly plans`, error))
        );
    }

    /**
     * Get plans that have a specific feature.
     * 
     * @param feature The feature to filter by
     * @returns Observable<IPlan[]> Array of plans with the feature
     */
    getPlansWithFeature(feature: string): Observable<IPlan[]> {
        return this.getAllPlans({ has_feature: feature }).pipe(
            catchError(error => this.handleError(`Failed to fetch plans with feature: ${feature}`, error))
        );
    }

    /**
     * Clear all cached plan data.
     * Useful when plan data is updated or user logs out.
     */
    clearCache(): void {
        this.plansCache.clear();
        this.planCache.clear();
        this.featuresCache.clear();
        this.comparisonCache.clear();
        this.currentPlanSubject.next(null);
    }

    /**
     * Refresh the current plan data.
     * 
     * @returns Observable<ICurrentSubscription> Updated subscription data
     */
    refreshCurrentPlan(): Observable<ICurrentSubscription> {
        return this.getCurrentPlan().pipe(
            tap(() => this.clearCache()),
            catchError(error => this.handleError('Failed to refresh current plan', error))
        );
    }

    /**
     * Generate a cache key based on the endpoint and filters.
     */
    private generateCacheKey(endpoint: string, filters?: IPlanFilter): string {
        if (!filters) {
            return endpoint;
        }
        const filterString = JSON.stringify(filters, Object.keys(filters).sort());
        return `${endpoint}:${btoa(filterString)}`;
    }

    /**
     * Build query parameters from filters.
     */
    private buildQueryParams(filters?: IPlanFilter): string {
        if (!filters) {
            return '';
        }

        const params = new URLSearchParams();

        if (filters.interval) {
            params.append('interval', filters.interval);
        }

        if (filters.featured !== undefined) {
            params.append('featured', filters.featured.toString());
        }

        if (filters.has_feature) {
            params.append('has_feature', filters.has_feature);
        }

        if (filters.min_price !== undefined) {
            params.append('min_price', filters.min_price.toString());
        }

        if (filters.max_price !== undefined) {
            params.append('max_price', filters.max_price.toString());
        }

        if (filters.trial_available !== undefined) {
            params.append('trial_available', filters.trial_available.toString());
        }

        if (filters.category) {
            params.append('category', filters.category);
        }

        return params.toString();
    }

    /**
     * Get cached data if it's still valid.
     */
    private getCachedData<T>(cache: Map<string, { data: T; timestamp: number }>, key: string): T | null {
        const cached = cache.get(key);
        if (!cached) {
            return null;
        }

        const now = Date.now();
        if (now - cached.timestamp > this.cacheDuration) {
            cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Set cached data with timestamp.
     */
    private setCachedData<T>(cache: Map<string, { data: T; timestamp: number }>, key: string, data: T): void {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Handle HTTP errors with user-friendly messages.
     */
    private handleError(message: string, error: any): Observable<never> {
        console.error(message, error);

        let errorMessage = message;

        if (error.status === 404) {
            errorMessage = 'The requested plan was not found';
        } else if (error.status === 422) {
            errorMessage = 'Invalid request parameters';
        } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later';
        } else if (error.error?.message) {
            errorMessage = error.error.message;
        }

        return throwError(() => new Error(errorMessage));
    }
}