import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Organization } from '../../../../shared/models/organization.model';

export interface WorkspaceFormValue {
  name: string;
  defaultLocale: 'en' | 'es' | 'fr';
  logoUrl: string | null;
}

@Component({
  selector: 'tf-workspace-settings-form',
  standalone: true,
  templateUrl: './workspace-settings-form.component.html',
  styleUrls: ['./workspace-settings-form.component.scss'],
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsFormComponent implements OnChanges {
  @Input() workspace: Organization | null = null;
  @Input() mode: 'create' | 'edit' = 'edit';
  @Input() saving = false;
  @Input() deleting = false;
  @Input() error: string | null = null;

  @Output() create = new EventEmitter<WorkspaceFormValue>();
  @Output() save = new EventEmitter<WorkspaceFormValue>();
  @Output() delete = new EventEmitter<void>();

  readonly localeOptions = [
    { value: 'en' as const, label: 'English' },
    { value: 'es' as const, label: 'Spanish' },
    { value: 'fr' as const, label: 'French' },
  ];

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    defaultLocale: this.fb.nonNullable.control<'en' | 'es' | 'fr'>('en'),
    logoUrl: this.fb.control('', { nonNullable: true }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workspace']) {
      this.patchFormForWorkspace();
    }

    if (changes['mode'] && this.mode === 'create' && !this.workspace) {
      this.resetForm();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: WorkspaceFormValue = {
      name: raw.name.trim(),
      defaultLocale: raw.defaultLocale,
      logoUrl: raw.logoUrl.trim() ? raw.logoUrl.trim() : null,
    };

    if (this.mode === 'create') {
      this.create.emit(payload);
    } else {
      this.save.emit(payload);
    }
  }

  handleDelete(): void {
    if (this.mode !== 'edit' || this.deleting) {
      return;
    }

    this.delete.emit();
  }

  get submitLabel(): string {
    if (this.saving) {
      return this.mode === 'create' ? 'Creating workspace...' : 'Saving changes...';
    }

    return this.mode === 'create' ? 'Create workspace' : 'Save changes';
  }

  get disableSubmit(): boolean {
    return this.saving || this.deleting;
  }

  get disableDelete(): boolean {
    return this.deleting || this.saving;
  }

  get controls() {
    return this.form.controls;
  }

  private patchFormForWorkspace(): void {
    if (this.workspace && this.mode === 'edit') {
      this.form.reset(
        {
          name: this.workspace.name,
          defaultLocale: this.workspace.defaultLocale,
          logoUrl: this.workspace.logoUrl ?? '',
        },
        { emitEvent: false }
      );
      return;
    }

    if (!this.workspace && this.mode === 'edit') {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.form.reset(
      {
        name: '',
        defaultLocale: 'en',
        logoUrl: '',
      },
      { emitEvent: false }
    );
  }
}
