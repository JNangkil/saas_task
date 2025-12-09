import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { BoardTemplate, CreateBoardRequest } from '../../models/board.model';

@Component({
  selector: 'app-create-board-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-board-modal.html',
  styleUrl: './create-board-modal.css',
})
export class CreateBoardModal implements OnInit {
  @Input() isOpen = false;
  @Input() tenantId!: string;
  @Input() workspaceId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  name = '';
  description = '';
  color = '#3b82f6';
  icon = 'dashboard';
  type: 'kanban' | 'list' | 'calendar' = 'kanban';
  selectedTemplateId: number | null = null;

  templates: BoardTemplate[] = [];
  isLoadingTemplates = false;
  isCreating = false;

  colors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#64748b', // Slate
  ];

  icons = [
    'dashboard', 'list', 'calendar_today', 'assignment',
    'bug_report', 'star', 'rocket', 'lightbulb',
    'work', 'people', 'timer', 'folder'
  ];

  constructor(private boardService: BoardService) { }

  ngOnInit(): void {
    this.fetchTemplates();
  }

  fetchTemplates(): void {
    this.isLoadingTemplates = true;
    this.boardService.getTemplates({ tenant_id: this.tenantId }).subscribe({
      next: (data) => {
        this.templates = data;
        this.isLoadingTemplates = false;
      },
      error: () => this.isLoadingTemplates = false
    });
  }

  selectTemplate(template: BoardTemplate | null): void {
    if (template) {
      this.selectedTemplateId = template.id;
      this.name = template.name; // Pre-fill name? Maybe user wants to rename.
      this.description = template.description || '';
      this.icon = template.icon || 'dashboard';
      // Type usually inferred from template, but backend handles it
    } else {
      this.selectedTemplateId = null;
      this.name = '';
      this.description = '';
      this.icon = 'dashboard';
    }
  }

  create(): void {
    if (!this.name || !this.workspaceId) return;

    this.isCreating = true;
    const request: CreateBoardRequest = {
      name: this.name,
      description: this.description,
      color: this.color,
      icon: this.icon,
      type: this.type,
      template_id: this.selectedTemplateId || undefined
    };

    this.boardService.createBoard(this.tenantId, this.workspaceId, request).subscribe({
      next: () => {
        this.isCreating = false;
        this.created.emit();
        this.closeModal();
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to create board', err);
        this.isCreating = false;
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  resetForm(): void {
    this.name = '';
    this.description = '';
    this.selectedTemplateId = null;
    this.color = '#3b82f6';
    this.icon = 'dashboard';
  }
}
