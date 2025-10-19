import { Component, Input } from '@angular/core';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

@Component({
  standalone: false,
  selector: 'tf-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss']
})
export class BadgeComponent {
  @Input() tone: BadgeTone = 'neutral';
  @Input() label = '';
}
