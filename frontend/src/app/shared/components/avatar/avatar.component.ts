import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'tf-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss']
})
export class AvatarComponent {
  @Input() src?: string;
  @Input() name = '';

  get initials(): string {
    return this.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
