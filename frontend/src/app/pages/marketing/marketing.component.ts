import { Component, signal } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-marketing-page',
  templateUrl: './marketing.component.html',
  styleUrls: ['./marketing.component.scss']
})
export class MarketingComponent {
  protected readonly title = signal('TaskFlow');
  protected readonly navLinks = signal([
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Projects', route: '/projects' },
    { label: 'Tasks', route: '/tasks' },
    { label: 'Teams', route: '/teams' },
    { label: 'Reports', route: '/reports' },
    { label: 'Settings', route: '/settings' }
  ]);
  protected readonly featureHighlights = signal([
    {
      name: 'Unified Task Views',
      description: 'Toggle between board, list, and calendar layouts without losing context.'
    },
    {
      name: 'Workspace Governance',
      description: 'Role-based access control keeps data secure across owners, admins, and members.'
    },
    {
      name: 'Actionable Insights',
      description: 'Visual dashboards and workload reports help teams stay aligned.'
    }
  ]);
  protected readonly milestones = signal([
    { name: 'Foundations', timeline: 'Weeks 1–4', focus: 'Auth, onboarding, workspace shell' },
    { name: 'Core Features', timeline: 'Weeks 5–10', focus: 'Projects, tasks, dashboard, teams' },
    { name: 'Enhancements', timeline: 'Weeks 11–14', focus: 'Calendar, reports, task detail drawer' },
    { name: 'Launch Readiness', timeline: 'Weeks 15–18', focus: 'Localization, accessibility, analytics' }
  ]);
}
