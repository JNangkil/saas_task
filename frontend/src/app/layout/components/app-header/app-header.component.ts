import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  protected quickActions = [
    { label: 'New Task', icon: '+', action: 'task' },
    { label: 'Invite', icon: '⇪', action: 'invite' }
  ];

  protected handleToggleSidebar(): void {
    this.toggleSidebar.emit();
  }
}
