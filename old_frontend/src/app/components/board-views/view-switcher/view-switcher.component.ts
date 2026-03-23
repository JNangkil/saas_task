import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ViewType = 'table' | 'kanban' | 'calendar';

@Component({
    selector: 'app-view-switcher',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './view-switcher.component.html',
    styleUrls: ['./view-switcher.component.scss']
})
export class ViewSwitcherComponent {
    @Input() currentView: ViewType = 'table';
    @Output() viewChange = new EventEmitter<ViewType>();

    options: { value: ViewType; label: string; icon: string }[] = [
        { value: 'table', label: 'Table', icon: 'list' },
        { value: 'kanban', label: 'Kanban', icon: 'columns' },
        { value: 'calendar', label: 'Calendar', icon: 'calendar' }
    ];

    switchView(view: ViewType) {
        if (this.currentView !== view) {
            this.viewChange.emit(view);
        }
    }
}
