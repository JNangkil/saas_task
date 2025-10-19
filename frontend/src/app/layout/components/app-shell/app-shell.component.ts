import { ChangeDetectionStrategy, Component, HostListener, OnInit, inject } from '@angular/core';
import { LayoutService } from '../../services/layout.service';

@Component({
  standalone: false,
  selector: 'app-app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent implements OnInit {
  private readonly layout = inject(LayoutService);
  private wasMobileView = false;

  protected readonly sidebarCollapsed$ = this.layout.observeSidebarCollapsed();

  ngOnInit(): void {
    this.wasMobileView = this.isMobileViewport();
    if (this.wasMobileView) {
      this.layout.setSidebarCollapsed(true);
    }
  }

  @HostListener('window:resize')
  protected handleViewportChange(): void {
    const isMobile = this.isMobileViewport();

    if (isMobile && !this.wasMobileView) {
      this.layout.setSidebarCollapsed(true);
    }

    if (!isMobile && this.wasMobileView) {
      this.layout.setSidebarCollapsed(false);
    }

    this.wasMobileView = isMobile;
  }

  protected handleToggleSidebar(): void {
    this.layout.toggleSidebar();
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches;
  }
}
