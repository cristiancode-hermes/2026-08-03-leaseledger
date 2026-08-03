import { Component, input } from '@angular/core';

@Component({
  selector: 'app-field-error',
  standalone: true,
  template: `@if (message()) {
    <div class="field-error">{{ message() }}</div>
  }`,
})
export class FieldError {
  readonly message = input<string>('');
}
