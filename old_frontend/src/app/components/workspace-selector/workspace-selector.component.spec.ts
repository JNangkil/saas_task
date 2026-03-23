import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceSelectorComponent } from './workspace-selector.component';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceService } from '../../services/workspace.service';
import { IWorkspace, IWorkspaceContext } from '../../interfaces/workspace.interface';
import { of, Subject } from 'rxjs';
import { ElementRef } from '@angular/core';

describe('WorkspaceSelectorComponent', () => {
  let component: WorkspaceSelectorComponent;
  let fixture: ComponentFixture<WorkspaceSelectorComponent>;
  let workspaceContextServiceMock: jasmine.SpyObj<WorkspaceContextService>;
  let workspaceServiceMock: jasmine.SpyObj<WorkspaceService>;
  let routerMock: jasmine.SpyObj<Router>;
  let elementRefMock: jasmine.SpyObj<ElementRef>;

  const mockWorkspace: IWorkspace = {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'Test Workspace',
    description: 'Test workspace description',
    color: '#6366f1',
    icon: '🏢',
    is_archived: false,
    is_default: true,
    is_active: true,
    user_role: 'owner',
    settings: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null
  };

  const mockWorkspaceContext: IWorkspaceContext = {
    currentWorkspace: mockWorkspace,
    userWorkspaces: [mockWorkspace],
    isLoading: false,
    error: null
  };

  beforeEach(async () => {
    const workspaceContextSpy = jasmine.createSpyObj('WorkspaceContextService', [
      'context$',
      'setCurrentWorkspace',
      'setUserWorkspaces',
      'context',
      'setError'
    ], {
      context$: of(mockWorkspaceContext),
      context: mockWorkspaceContext
    });

    const workspaceServiceSpy = jasmine.createSpyObj('WorkspaceService', [
      'getCurrentTenantWorkspaces'
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    const elementRefSpy = jasmine.createSpyObj('ElementRef', [''], {
      nativeElement: document.createElement('div')
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, WorkspaceSelectorComponent],
      providers: [
        { provide: WorkspaceContextService, useValue: workspaceContextSpy },
        { provide: WorkspaceService, useValue: workspaceServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ElementRef, useValue: elementRefSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceSelectorComponent);
    component = fixture.componentInstance;
    workspaceContextServiceMock = TestBed.inject(WorkspaceContextService) as jasmine.SpyObj<WorkspaceContextService>;
    workspaceServiceMock = TestBed.inject(WorkspaceService) as jasmine.SpyObj<WorkspaceService>;
    routerMock = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    elementRefMock = TestBed.inject(ElementRef) as jasmine.SpyObj<ElementRef>;

    spyOn(component, 'ngOnDestroy').and.callThrough();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize context observable from WorkspaceContextService', () => {
    expect(component.context$).toBeDefined();
  });

  describe('toggleDropdown', () => {
    it('should toggle dropdown open state', () => {
      expect(component.isDropdownOpen).toBe(false);

      component.toggleDropdown();
      expect(component.isDropdownOpen).toBe(true);

      component.toggleDropdown();
      expect(component.isDropdownOpen).toBe(false);
    });
  });

  describe('selectWorkspace', () => {
    it('should set current workspace and close dropdown', () => {
      component.isDropdownOpen = true;

      component.selectWorkspace(mockWorkspace);

      expect(workspaceContextServiceMock.setCurrentWorkspace).toHaveBeenCalledWith(mockWorkspace);
      expect(component.isDropdownOpen).toBe(false);
    });
  });

  describe('goToWorkspaceManagement', () => {
    it('should close dropdown and navigate to workspaces', () => {
      component.isDropdownOpen = true;

      component.goToWorkspaceManagement();

      expect(component.isDropdownOpen).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/workspaces']);
    });
  });

  describe('trackWorkspace', () => {
    it('should return workspace id as track key', () => {
      const result = component.trackWorkspace(0, mockWorkspace);
      expect(result).toBe(mockWorkspace.id);
    });
  });

  describe('getIconBackground', () => {
    it('should return default gradient when no color provided', () => {
      const result = component.getIconBackground();
      expect(result).toBe('linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)');
    });

    it('should return gradient with provided color', () => {
      const color = '#ff0000';
      const result = component.getIconBackground(color);
      expect(result).toContain(color);
      expect(result).toContain('linear-gradient(135deg');
    });
  });

  describe('formatRole', () => {
    it('should capitalize first letter of role', () => {
      expect(component.formatRole('owner')).toBe('Owner');
      expect(component.formatRole('admin')).toBe('Admin');
      expect(component.formatRole('member')).toBe('Member');
      expect(component.formatRole('viewer')).toBe('Viewer');
    });
  });

  describe('darkenColor (private method)', () => {
    it('should darken a hex color', () => {
      const color = '#6366f1';
      const result = (component as any).darkenColor(color, 20);
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(result).not.toBe(color);
    });

    it('should handle edge case for black color', () => {
      const color = '#000000';
      const result = (component as any).darkenColor(color, 50);
      expect(result).toBe('#000000');
    });
  });

  describe('onClickOutside', () => {
    it('should close dropdown when clicking outside', () => {
      component.isDropdownOpen = true;

      const event = {
        target: document.createElement('div')
      } as MouseEvent;

      elementRefMock.nativeElement.contains = jasmine.createSpy('contains').and.returnValue(false);

      component.onClickOutside(event);

      expect(component.isDropdownOpen).toBe(false);
    });

    it('should not close dropdown when clicking inside', () => {
      component.isDropdownOpen = true;

      const event = {
        target: document.createElement('div')
      } as MouseEvent;

      elementRefMock.nativeElement.contains = jasmine.createSpy('contains').and.returnValue(true);

      component.onClickOutside(event);

      expect(component.isDropdownOpen).toBe(true);
    });
  });

  describe('onEscapeKey', () => {
    it('should close dropdown when escape key is pressed', () => {
      component.isDropdownOpen = true;

      component.onEscapeKey();

      expect(component.isDropdownOpen).toBe(false);
    });
  });

  describe('ngOnInit', () => {
    it('should load user workspaces on init', () => {
      const mockWorkspaces = [mockWorkspace];
      workspaceServiceMock.getCurrentTenantWorkspaces.and.returnValue(of(mockWorkspaces));

      component.ngOnInit();

      expect(workspaceServiceMock.getCurrentTenantWorkspaces).toHaveBeenCalled();
      expect(workspaceContextServiceMock.setUserWorkspaces).toHaveBeenCalledWith(mockWorkspaces);
    });

    it('should set first workspace as current if none exists', () => {
      const mockWorkspaces = [mockWorkspace];
      workspaceContextServiceMock.context = { ...mockWorkspaceContext, currentWorkspace: null };
      workspaceServiceMock.getCurrentTenantWorkspaces.and.returnValue(of(mockWorkspaces));

      component.ngOnInit();

      expect(workspaceContextServiceMock.setCurrentWorkspace).toHaveBeenCalledWith(mockWorkspace);
    });

    it('should handle error when loading workspaces', () => {
      const error = new Error('Failed to load');
      workspaceServiceMock.getCurrentTenantWorkspaces.and.returnValue(new Subject());

      spyOn(console, 'error');
      component.ngOnInit();

      workspaceServiceMock.getCurrentTenantWorkspaces().error(error);

      expect(console.error).toHaveBeenCalledWith('Error loading workspaces:', error);
      expect(workspaceContextServiceMock.setError).toHaveBeenCalledWith('Failed to load workspaces');
    });

    it('should handle null workspaces response', () => {
      workspaceServiceMock.getCurrentTenantWorkspaces.and.returnValue(of(null));

      component.ngOnInit();

      expect(workspaceContextServiceMock.setUserWorkspaces).toHaveBeenCalledWith([]);
    });
  });

  describe('ngOnDestroy', () => {
    it('should destroy subscriptions', () => {
      const destroySpy = spyOn((component as any).destroy$, 'next');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should render workspace selector with current workspace info', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.workspace-name')).toBeTruthy();
      expect(compiled.querySelector('.workspace-name')?.textContent).toContain('Test Workspace');
    });

    it('should render dropdown when isDropdownOpen is true', () => {
      component.isDropdownOpen = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.dropdown-panel')).toBeTruthy();
    });

    it('should not render dropdown when isDropdownOpen is false', () => {
      component.isDropdownOpen = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.dropdown-panel')).toBeFalsy();
    });

    it('should render workspace count when multiple workspaces', () => {
      const multipleWorkspacesContext = {
        ...mockWorkspaceContext,
        userWorkspaces: [mockWorkspace, { ...mockWorkspace, id: '2', name: 'Workspace 2' }]
      };
      workspaceContextServiceMock.context$ = of(multipleWorkspacesContext);

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.workspace-meta')?.textContent).toContain('2 workspaces');
    });

    it('should not render workspace count when only one workspace', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.workspace-meta')).toBeFalsy();
    });
  });

  describe('workspace role badges', () => {
    it('should render role badge with correct class', () => {
      component.isDropdownOpen = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const roleBadge = compiled.querySelector('.role-badge');

      expect(roleBadge).toBeTruthy();
      expect(roleBadge?.classList).toContain('badge-owner');
      expect(roleBadge?.textContent).toContain('Owner');
    });
  });

  describe('workspace icon background', () => {
    it('should apply correct background gradient', () => {
      component.isDropdownOpen = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const workspaceIcon = compiled.querySelector('.workspace-icon');

      expect(workspaceIcon?.getAttribute('style')).toContain('background');
      expect(workspaceIcon?.getAttribute('style')).toContain('#6366f1');
    });
  });
});