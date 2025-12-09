import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ColumnType, ColumnTypeDefinition, ColumnOptions, StatusOption } from '../models';

/**
 * Service for managing column type configurations and metadata
 */
@Injectable({
    providedIn: 'root'
})
export class ColumnTypeConfigurationService {

    /**
     * Get all available column types with their definitions
     * 
     * @returns Observable<ColumnTypeDefinition[]> Array of column type definitions
     */
    getColumnTypes(): Observable<ColumnTypeDefinition[]> {
        return of(this.getAllColumnTypes());
    }

    /**
     * Get column type definition by type
     * 
     * @param type The column type
     * @returns ColumnTypeDefinition | null Column type definition or null if not found
     */
    getColumnTypeDefinition(type: ColumnType): ColumnTypeDefinition | null {
        const types = this.getAllColumnTypes();
        return types.find(ct => ct.type === type) || null;
    }

    /**
     * Get default options for a column type
     * 
     * @param type The column type
     * @returns ColumnOptions Default options for the column type
     */
    getDefaultOptions(type: ColumnType): ColumnOptions {
        const definition = this.getColumnTypeDefinition(type);
        return definition ? definition.defaultOptions : {};
    }

    /**
     * Get default width for a column type
     * 
     * @param type The column type
     * @returns number Default width in pixels
     */
    getDefaultWidth(type: ColumnType): number {
        const widthMap: Record<ColumnType, number> = {
            'text': 200,
            'long_text': 250,
            'number': 120,
            'date': 120,
            'datetime': 150,
            'status': 120,
            'priority': 120,
            'assignee': 150,
            'labels': 180,
            'checkbox': 80,
            'url': 200,
            'email': 180,
            'phone': 140,
            'currency': 120,
            'percentage': 100,
        };

        return widthMap[type] || 150;
    }

    /**
     * Get filter operators for a column type
     * 
     * @param type The column type
     * @returns string[] Array of filter operators
     */
    getFilterOperators(type: ColumnType): string[] {
        const definition = this.getColumnTypeDefinition(type);
        return definition ? definition.filterOperators : [];
    }

    /**
     * Check if a column type supports multiple values
     * 
     * @param type The column type
     * @returns boolean True if supports multiple values
     */
    supportsMultipleValues(type: ColumnType): boolean {
        const definition = this.getColumnTypeDefinition(type);
        return definition ? definition.supportsMultipleValues : false;
    }

    /**
     * Check if a column type is sortable
     * 
     * @param type The column type
     * @returns boolean True if sortable
     */
    isSortable(type: ColumnType): boolean {
        const definition = this.getColumnTypeDefinition(type);
        return definition ? definition.isSortable : false;
    }

    /**
     * Check if a column type is filterable
     * 
     * @param type The column type
     * @returns boolean True if filterable
     */
    isFilterable(type: ColumnType): boolean {
        const definition = this.getColumnTypeDefinition(type);
        return definition ? definition.isFilterable : false;
    }

    /**
     * Get default value for a column type
     * 
     * @param type The column type
     * @returns any Default value
     */
    getDefaultValue(type: ColumnType): any {
        const definition = this.getColumnTypeDefinition(type);
        return definition ? definition.defaultValue : null;
    }

    /**
     * Get default board columns
     * 
     * @returns Array of default column configurations
     */
    getDefaultBoardColumns(): Array<{ name: string; type: ColumnType; options: ColumnOptions; position: number; width?: number }> {
        return [
            {
                name: 'Title',
                type: 'text',
                options: this.getDefaultOptions('text'),
                position: 1,
                width: 300
            },
            {
                name: 'Status',
                type: 'status',
                options: this.getDefaultOptions('status'),
                position: 2,
                width: 120
            },
            {
                name: 'Priority',
                type: 'priority',
                options: this.getDefaultOptions('priority'),
                position: 3,
                width: 120
            },
            {
                name: 'Assignee',
                type: 'assignee',
                options: this.getDefaultOptions('assignee'),
                position: 4,
                width: 150
            },
            {
                name: 'Due Date',
                type: 'date',
                options: this.getDefaultOptions('date'),
                position: 5,
                width: 120
            }
        ];
    }

    /**
     * Get column type categories
     * 
     * @returns Array of column type categories
     */
    getColumnCategories(): Array<{ name: string; label: string; types: ColumnType[] }> {
        return [
            {
                name: 'text',
                label: 'Text',
                types: ['text', 'long_text']
            },
            {
                name: 'number',
                label: 'Number',
                types: ['number', 'currency', 'percentage']
            },
            {
                name: 'date',
                label: 'Date',
                types: ['date', 'datetime']
            },
            {
                name: 'selection',
                label: 'Selection',
                types: ['status', 'priority', 'assignee', 'labels', 'checkbox']
            },
            {
                name: 'contact',
                label: 'Contact',
                types: ['email', 'phone']
            },
            {
                name: 'web',
                label: 'Web',
                types: ['url']
            }
        ];
    }

    /**
     * Format value for display based on column type
     * 
     * @param type The column type
     * @param value The value to format
     * @param options Column options
     * @returns string Formatted value
     */
    formatValue(type: ColumnType, value: any, options?: ColumnOptions): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        switch (type) {
            case 'text':
            case 'long_text':
            case 'url':
            case 'email':
            case 'phone':
                return String(value);

            case 'number':
                const numOptions = options as any;
                const decimals = numOptions?.number_decimal_places || 0;
                return Number(value).toFixed(decimals);

            case 'currency':
                const currOptions = options as any;
                const currDecimals = currOptions?.number_decimal_places || 2;
                const symbol = currOptions?.symbol || '$';
                return `${symbol}${Number(value).toFixed(currDecimals)}`;

            case 'percentage':
                const percOptions = options as any;
                const percDecimals = percOptions?.percentage_decimal_places || 0;
                return `${Number(value).toFixed(percDecimals)}%`;

            case 'date':
                return new Date(value).toLocaleDateString();

            case 'datetime':
                return new Date(value).toLocaleString();

            case 'status':
            case 'priority':
                const statusOptions = options?.status_options || [];
                const statusOption = statusOptions.find((opt: StatusOption) => opt.value === value);
                return statusOption ? statusOption.label : String(value);

            case 'labels':
                if (Array.isArray(value)) {
                    return value.join(', ');
                }
                return String(value);

            case 'checkbox':
                return value ? 'Yes' : 'No';

            default:
                return String(value);
        }
    }

    /**
     * Get all column type definitions
     * 
     * @returns ColumnTypeDefinition[] Array of all column type definitions
     */
    private getAllColumnTypes(): ColumnTypeDefinition[] {
        return [
            {
                type: 'text',
                label: 'Text',
                icon: 'fas fa-font',
                defaultOptions: {
                    placeholder: '',
                    max_length: 255,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        max_length: { type: 'number', minimum: 1, maximum: 255 },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'string' },
                component: 'TextInput',
                filterOperators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: ''
            },
            {
                type: 'long_text',
                label: 'Long Text',
                icon: 'fas fa-align-left',
                defaultOptions: {
                    placeholder: '',
                    max_length: 5000,
                    required: false,
                    rows: 3
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        max_length: { type: 'number', minimum: 1, maximum: 5000 },
                        required: { type: 'boolean' },
                        rows: { type: 'number', minimum: 1, maximum: 10 }
                    }
                },
                valueSchema: { type: 'string' },
                component: 'TextareaInput',
                filterOperators: ['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: ''
            },
            {
                type: 'number',
                label: 'Number',
                icon: 'fas fa-hashtag',
                defaultOptions: {
                    placeholder: '',
                    number_min: null,
                    number_max: null,
                    number_decimal_places: 0,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        number_min: { type: 'number' },
                        number_max: { type: 'number' },
                        number_decimal_places: { type: 'number', minimum: 0, maximum: 10 },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'number' },
                component: 'NumberInput',
                filterOperators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: 0
            },
            {
                type: 'date',
                label: 'Date',
                icon: 'fas fa-calendar',
                defaultOptions: {
                    date_required: false,
                    default_to_today: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        date_required: { type: 'boolean' },
                        default_to_today: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'string', format: 'date' },
                component: 'DateInput',
                filterOperators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: null
            },
            {
                type: 'datetime',
                label: 'Date & Time',
                icon: 'fas fa-calendar-alt',
                defaultOptions: {
                    date_required: false,
                    default_to_now: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        date_required: { type: 'boolean' },
                        default_to_now: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'string', format: 'date-time' },
                component: 'DateTimeInput',
                filterOperators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: null
            },
            {
                type: 'status',
                label: 'Status',
                icon: 'fas fa-flag',
                defaultOptions: {
                    status_required: false,
                    status_options: [
                        { value: 'todo', label: 'To Do', color: '#6B7280' },
                        { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
                        { value: 'done', label: 'Done', color: '#10B981' }
                    ]
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        status_required: { type: 'boolean' },
                        status_options: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    value: { type: 'string' },
                                    label: { type: 'string' },
                                    color: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                valueSchema: { type: 'string' },
                component: 'StatusSelect',
                filterOperators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: 'todo'
            },
            {
                type: 'priority',
                label: 'Priority',
                icon: 'fas fa-exclamation-circle',
                defaultOptions: {
                    status_required: false,
                    status_options: [
                        { value: 'low', label: 'Low', color: '#6B7280' },
                        { value: 'medium', label: 'Medium', color: '#F59E0B' },
                        { value: 'high', label: 'High', color: '#EF4444' },
                        { value: 'urgent', label: 'Urgent', color: '#DC2626' }
                    ]
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        status_required: { type: 'boolean' },
                        status_options: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    value: { type: 'string' },
                                    label: { type: 'string' },
                                    color: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                valueSchema: { type: 'string' },
                component: 'PrioritySelect',
                filterOperators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: 'medium'
            },
            {
                type: 'assignee',
                label: 'Assignee',
                icon: 'fas fa-user',
                defaultOptions: {
                    assignee_multiple: false,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        assignee_multiple: { type: 'boolean' },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'number' },
                component: 'UserSelect',
                filterOperators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: true,
                isSortable: true,
                isFilterable: true,
                defaultValue: null
            },
            {
                type: 'labels',
                label: 'Labels',
                icon: 'fas fa-tags',
                defaultOptions: {
                    labels_multiple: true,
                    max_labels: 10,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        labels_multiple: { type: 'boolean' },
                        max_labels: { type: 'number', minimum: 1, maximum: 50 },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'array', items: { type: 'string' } },
                component: 'LabelSelect',
                filterOperators: ['contains', 'not_contains', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: true,
                isSortable: false,
                isFilterable: true,
                defaultValue: []
            },
            {
                type: 'checkbox',
                label: 'Checkbox',
                icon: 'fas fa-check-square',
                defaultOptions: {
                    default_value: false,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        default_value: { type: 'boolean' },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'boolean' },
                component: 'CheckboxInput',
                filterOperators: ['equals', 'not_equals'],
                supportsMultipleValues: false,
                isSortable: false,
                isFilterable: true,
                defaultValue: false
            },
            {
                type: 'url',
                label: 'URL',
                icon: 'fas fa-link',
                defaultOptions: {
                    placeholder: 'https://example.com',
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'string', format: 'uri' },
                component: 'UrlInput',
                filterOperators: ['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: ''
            },
            {
                type: 'email',
                label: 'Email',
                icon: 'fas fa-envelope',
                defaultOptions: {
                    placeholder: 'email@example.com',
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'string', format: 'email' },
                component: 'EmailInput',
                filterOperators: ['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: ''
            },
            {
                type: 'phone',
                label: 'Phone',
                icon: 'fas fa-phone',
                defaultOptions: {
                    placeholder: '+1 (555) 123-4567',
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'string' },
                component: 'PhoneInput',
                filterOperators: ['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: ''
            },
            {
                type: 'currency',
                label: 'Currency',
                icon: 'fas fa-dollar-sign',
                defaultOptions: {
                    placeholder: '0.00',
                    currency_code: 'USD',
                    symbol: '$',
                    number_decimal_places: 2,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        currency_code: { type: 'string' },
                        symbol: { type: 'string' },
                        number_decimal_places: { type: 'number', minimum: 0, maximum: 10 },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'number' },
                component: 'CurrencyInput',
                filterOperators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: 0
            },
            {
                type: 'percentage',
                label: 'Percentage',
                icon: 'fas fa-percent',
                defaultOptions: {
                    placeholder: '0%',
                    percentage_min: 0,
                    percentage_max: 100,
                    percentage_decimal_places: 0,
                    required: false
                },
                optionsSchema: {
                    type: 'object',
                    properties: {
                        placeholder: { type: 'string' },
                        percentage_min: { type: 'number' },
                        percentage_max: { type: 'number' },
                        percentage_decimal_places: { type: 'number', minimum: 0, maximum: 10 },
                        required: { type: 'boolean' }
                    }
                },
                valueSchema: { type: 'number' },
                component: 'PercentageInput',
                filterOperators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'],
                supportsMultipleValues: false,
                isSortable: true,
                isFilterable: true,
                defaultValue: 0
            }
        ];
    }
}