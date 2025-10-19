import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
  standalone: false,
  selector: '[tfAutofocus]'
})
export class AutofocusDirective implements AfterViewInit {
  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    queueMicrotask(() => this.elementRef.nativeElement.focus());
  }
}
