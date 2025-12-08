import { Directive, TemplateRef } from '@angular/core';

/**
 * Directive to mark a template as the "else" block for an *ifPlanHas directive.
 * 
 * This directive is used to provide alternative content when the *ifPlanHas condition
 * is not met. It should be applied to an ng-template element that is referenced
 * by the else parameter of the *ifPlanHas directive.
 * 
 * @example
 * ```html
 * <div *ifPlanHas="'analytics'; else noAnalytics">
 *   <analytics-dashboard></analytics-dashboard>
 * </div>
 * 
 * <ng-template #noAnalytics>
 *   <upgrade-prompt feature="analytics"></upgrade-prompt>
 * </ng-template>
 * ```
 */
@Directive({
    selector: '[ifPlanHasElse]',
    standalone: true
})
export class IfPlanHasElseDirective {
    /**
     * Creates an instance of IfPlanHasElseDirective.
     * 
     * @param templateRef The template reference that will be rendered when the condition is false
     */
    constructor(public templateRef: TemplateRef<any>) { }
}