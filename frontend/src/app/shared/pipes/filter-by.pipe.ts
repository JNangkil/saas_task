import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: false,
  name: 'filterBy'
})
export class FilterByPipe implements PipeTransform {
  transform<T>(collection: T[], predicate: (item: T) => boolean): T[] {
    if (!Array.isArray(collection)) {
      return [];
    }

    return collection.filter(predicate);
  }
}
