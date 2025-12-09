import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { SuperAdminService, SystemSettings } from '../../../../services/super-admin.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

interface SettingItem {
  key: string;
  value: any;
  description: string;
  type: string;
  is_public: boolean;
}

interface SaveStatus {
  type: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-system-settings',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    KeyValuePipe
  ],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettings implements OnInit {
  settings: SettingItem[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  typeFilter = '';
  saveStatus: SaveStatus | null = null;
  private saveStatusTimeout: any;

  constructor(
    private superAdminService: SuperAdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  get filteredSettings(): SettingItem[] {
    let filtered = this.settings;

    if (this.searchTerm) {
      filtered = filtered.filter(setting =>
        setting.key.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        setting.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.typeFilter) {
      filtered = filtered.filter(setting => setting.type === this.typeFilter);
    }

    return filtered;
  }

  get groupedSettings(): { [key: string]: SettingItem[] } {
    const groups: { [key: string]: SettingItem[] } = {};

    this.filteredSettings.forEach(setting => {
      const group = setting.key.split('.')[0] || 'General';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(setting);
    });

    // Sort settings within each group
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => a.key.localeCompare(b.key));
    });

    return groups;
  }

  loadSettings() {
    this.loading = true;
    this.error = null;

    const params: any = {};
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.typeFilter) params.type = this.typeFilter;

    this.superAdminService.getSystemSettings(params).subscribe({
      next: (settingsData) => {
        this.settings = Object.entries(settingsData).map(([key, value]) => ({
          key,
          value,
          description: '', // Would need additional API call to get descriptions
          type: this.inferType(value),
          is_public: false // Would need additional API call
        }));
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load system settings. Please try again.';
        this.loading = false;
        console.error('Error loading system settings:', error);
      }
    });
  }

  applySearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
  }

  onTypeChange(event: any) {
    this.typeFilter = event.value;
    this.loadSettings();
  }

  settingValue(key: string): any {
    const setting = this.settings.find(s => s.key === key);
    return setting ? setting.value : null;
  }

  updateSetting(key: string, value: any) {
    this.superAdminService.updateSystemSetting(key, value).subscribe({
      next: () => {
        // Update local setting
        const setting = this.settings.find(s => s.key === key);
        if (setting) {
          setting.value = value;
        }

        this.showSaveStatus('success', `Setting "${key}" updated successfully`);
      },
      error: (error) => {
        this.showSaveStatus('error', `Failed to update setting "${key}"`);
        console.error('Error updating setting:', error);
      }
    });
  }

  createSetting() {
    // TODO: Implement create setting dialog
    this.snackBar.open('Create setting feature coming soon', 'Close', {
      duration: 3000
    });
  }

  editSetting(setting: SettingItem) {
    // TODO: Implement edit setting dialog
    this.snackBar.open(`Edit setting: ${setting.key}`, 'Close', {
      duration: 3000
    });
  }

  deleteSetting(setting: SettingItem) {
    if (confirm(`Are you sure you want to delete the setting "${setting.key}"?`)) {
      // TODO: Implement delete setting functionality
      this.snackBar.open('Delete setting feature coming soon', 'Close', {
        duration: 3000
      });
    }
  }

  formatGroupName(group: string): string {
    return group.charAt(0).toUpperCase() + group.slice(1).replace(/_/g, ' ');
  }

  inferType(value: any): string {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return 'string';
  }

  formatJsonForDisplay(value: any): string {
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return JSON.stringify(value, null, 2);
  }

  parseJsonValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private showSaveStatus(type: 'success' | 'error', message: string) {
    // Clear any existing timeout
    if (this.saveStatusTimeout) {
      clearTimeout(this.saveStatusTimeout);
    }

    this.saveStatus = { type, message };

    // Auto-hide after 3 seconds
    this.saveStatusTimeout = setTimeout(() => {
      this.saveStatus = null;
    }, 3000);
  }
}
