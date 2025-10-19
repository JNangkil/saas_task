import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: false,
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 120, trailing = '…'): string {
    if (!value || value.length <= limit) {
      return value;
    }

    return `${value.slice(0, limit).trimEnd()}${trailing}`;
  }
}
