import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, Observable } from 'rxjs';
import { TaskService } from './task.service';
import { ApiService } from './api.service';
import { Task, TaskCreate, TaskUpdate, TaskPositionUpdate, TasksPaginatedResponse } from '../models';

describe('TaskService', () => {
    let service: TaskService;
    let apiServiceMock: jasmine.SpyObj<ApiService>;
    let httpTestingController: HttpTestingController;

    const mockTask: Task = {
        id: 1,
        tenant_id: 1,
        workspace_id: 1,
        board_id: 1,
        title: 'Test Task',
        description: 'Test Description',
        status: 'todo',
        priority: 'medium',
        assignee_id: 1,
        creator_id: 1,
        due_date: '2023-12-31',
        start_date: '2023-12-01',
        position: 1,
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    const mockTasksResponse: TasksPaginatedResponse = {
        data: [mockTask],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 1
    };

    beforeEach(() => {
        const apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                TaskService,
                { provide: ApiService, useValue: apiSpy }
            ]
        });

        service = TestBed.inject(TaskService);
        apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getTasks', () => {
        it('should get tasks for a workspace', () => {
            const tenantId = 1;
            const workspaceId = 1;

            apiServiceMock.get.and.returnValue(of(mockTasksResponse));

            service.getTasks(tenantId, workspaceId).subscribe(response => {
                expect(response).toEqual(mockTasksResponse);
            });

            expect(apiServiceMock.get).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks',
                jasmine.objectContaining({
                    params: jasmine.objectContaining({
                        page: '1',
                        per_page: '15',
                        include: ''
                    })
                })
            );
        });

        it('should get tasks for a board', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const boardId = 1;

            apiServiceMock.get.and.returnValue(of(mockTasksResponse));

            service.getTasks(tenantId, workspaceId, boardId).subscribe(response => {
                expect(response).toEqual(mockTasksResponse);
            });

            expect(apiServiceMock.get).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/boards/1/tasks',
                jasmine.any(Object)
            );
        });

        it('should apply filters', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const filters = {
                search: 'test',
                status: ['todo'],
                priority: ['high']
            };

            apiServiceMock.get.and.returnValue(of(mockTasksResponse));

            service.getTasks(tenantId, workspaceId, undefined, filters).subscribe(response => {
                expect(response).toEqual(mockTasksResponse);
            });

            expect(apiServiceMock.get).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks',
                jasmine.objectContaining({
                    params: jasmine.objectContaining({
                        search: 'test',
                        status: ['todo'],
                        priority: ['high']
                    })
                })
            );
        });
    });

    describe('getTask', () => {
        it('should get a single task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;

            apiServiceMock.get.and.returnValue(of(mockTask));

            service.getTask(tenantId, workspaceId, taskId).subscribe(response => {
                expect(response).toEqual(mockTask);
            });

            expect(apiServiceMock.get).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1',
                jasmine.objectContaining({
                    params: jasmine.objectContaining({
                        include: 'labels,custom_values,assignee,creator,board,workspace,comments'
                    })
                })
            );
        });
    });

    describe('createTask', () => {
        it('should create a new task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskData: TaskCreate = {
                title: 'New Task',
                description: 'New Description',
                status: 'todo',
                priority: 'high'
            };

            apiServiceMock.post.and.returnValue(of(mockTask));

            service.createTask(tenantId, workspaceId, taskData).subscribe(response => {
                expect(response).toEqual(mockTask);
            });

            expect(apiServiceMock.post).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks',
                taskData
            );
        });
    });

    describe('updateTask', () => {
        it('should update an existing task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;
            const taskData: TaskUpdate = {
                title: 'Updated Task',
                status: 'in_progress'
            };

            apiServiceMock.put.and.returnValue(of(mockTask));

            service.updateTask(tenantId, workspaceId, taskId, taskData).subscribe(response => {
                expect(response).toEqual(mockTask);
            });

            expect(apiServiceMock.put).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1',
                taskData
            );
        });
    });

    describe('deleteTask', () => {
        it('should delete a task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;

            apiServiceMock.delete.and.returnValue(of({ message: 'Task deleted successfully' }));

            service.deleteTask(tenantId, workspaceId, taskId).subscribe(response => {
                expect(response).toEqual({ message: 'Task deleted successfully' });
            });

            expect(apiServiceMock.delete).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1'
            );
        });
    });

    describe('archiveTask', () => {
        it('should archive a task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;

            apiServiceMock.post.and.returnValue(of({ message: 'Task archived successfully' }));

            service.archiveTask(tenantId, workspaceId, taskId).subscribe(response => {
                expect(response).toEqual({ message: 'Task archived successfully' });
            });

            expect(apiServiceMock.post).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1/archive'
            );
        });
    });

    describe('restoreTask', () => {
        it('should restore an archived task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;

            apiServiceMock.post.and.returnValue(of({ message: 'Task restored successfully' }));

            service.restoreTask(tenantId, workspaceId, taskId).subscribe(response => {
                expect(response).toEqual({ message: 'Task restored successfully' });
            });

            expect(apiServiceMock.post).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1/restore'
            );
        });
    });

    describe('duplicateTask', () => {
        it('should duplicate a task', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;

            apiServiceMock.post.and.returnValue(of(mockTask));

            service.duplicateTask(tenantId, workspaceId, taskId).subscribe(response => {
                expect(response).toEqual(mockTask);
            });

            expect(apiServiceMock.post).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1/duplicate'
            );
        });
    });

    describe('updateTaskPosition', () => {
        it('should update task position', () => {
            const tenantId = 1;
            const workspaceId = 1;
            const taskId = 1;
            const positionData: TaskPositionUpdate = {
                position: 2,
                board_id: 2
            };

            apiServiceMock.put.and.returnValue(of(mockTask));

            service.updateTaskPosition(tenantId, workspaceId, taskId, positionData).subscribe(response => {
                expect(response).toEqual(mockTask);
            });

            expect(apiServiceMock.put).toHaveBeenCalledWith(
                'tenants/1/workspaces/1/tasks/1/position',
                positionData
            );
        });
    });

    describe('task cache management', () => {
        it('should get current tasks', () => {
            const tasks = service.getCurrentTasks();
            expect(tasks).toEqual([]);
        });

        it('should clear task cache', () => {
            service.clearTaskCache();
            const tasks = service.getCurrentTasks();
            expect(tasks).toEqual([]);
        });
    });
});