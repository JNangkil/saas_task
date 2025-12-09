/**
 * Interface for BoardColumn entity
 */
export interface BoardColumn {
    id: number;
    board_id: number;
    name: string;
    type: ColumnType;
    position: number;
    width?: number;
    is_pinned: boolean;
    is_required: boolean;
    options?: ColumnOptions;
    created_at: string;
    updated_at: string;
}

/**
 * Column type enumeration
 */
export type ColumnType =
    | 'text'
    | 'long_text'
    | 'number'
    | 'date'
    | 'datetime'
    | 'status'
    | 'priority'
    | 'assignee'
    | 'labels'
    | 'checkbox'
    | 'url'
    | 'email'
    | 'phone'
    | 'currency'
    | 'percentage';

/**
 * Interface for column options based on type
 */
export interface ColumnOptions {
    // Text options
    placeholder?: string;
    max_length?: number;
    rows?: number;

    // Number options
    number_min?: number | null;
    number_max?: number | null;
    number_decimal_places?: number;

    // Date options
    date_required?: boolean;
    default_to_today?: boolean;
    default_to_now?: boolean;

    // Status/Priority options
    status_required?: boolean;
    status_options?: StatusOption[];

    // Assignee options
    assignee_multiple?: boolean;

    // Labels options
    labels_multiple?: boolean;
    max_labels?: number;

    // Checkbox options
    default_value?: boolean;

    // Currency options
    currency_code?: string;
    symbol?: string;

    // Percentage options
    percentage_min?: number;
    percentage_max?: number;
    percentage_decimal_places?: number;

    // Common options
    required?: boolean;
}

/**
 * Interface for status/priority options
 */
export interface StatusOption {
    value: string;
    label: string;
    color: string;
}

/**
 * Interface for TaskFieldValue entity
 */
export interface TaskFieldValue {
    id: number;
    task_id: number;
    board_column_id: number;
    value: any;
    created_at: string;
    updated_at: string;
    board_column?: BoardColumn;
}

/**
 * Interface for UserBoardPreferences entity
 */
export interface UserBoardPreferences {
    id: number;
    user_id: number;
    board_id: number;
    column_preferences?: ColumnPreferences;
    created_at: string;
    updated_at: string;
}

/**
 * Interface for column preferences
 */
export interface ColumnPreferences {
    column_order?: number[];
    column_widths?: Record<number, number>;
    hidden_columns?: number[];
    saved_filters?: SavedFilter[];
}

/**
 * Interface for saved filter
 */
export interface SavedFilter {
    id: string;
    name: string;
    filters: FilterCondition[];
    logic?: 'and' | 'or';
}

/**
 * Interface for filter condition
 */
export interface FilterCondition {
    id: string;
    column_id: number;
    column_type: ColumnType;
    operator: FilterOperator;
    value: any;
    logic?: 'and' | 'or';
}

/**
 * Filter operators based on column type
 */
export type FilterOperator =
    // Text operators
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'is_empty'
    | 'is_not_empty'

    // Number operators
    | 'greater_than'
    | 'less_than'
    | 'greater_equal'
    | 'less_equal'

    // List operators
    | 'in'
    | 'not_in'
    | 'contains'
    | 'not_contains'
    | 'contains_all'
    | 'contains_any';

/**
 * Interface for column type definition
 */
export interface ColumnTypeDefinition {
    type: ColumnType;
    label: string;
    icon: string;
    defaultOptions: ColumnOptions;
    optionsSchema: any; // JSON Schema
    valueSchema: any; // JSON Schema
    component: string; // Angular component name
    filterOperators: FilterOperator[];
    supportsMultipleValues: boolean;
    isSortable: boolean;
    isFilterable: boolean;
    defaultValue: any;
}

/**
 * Interface for column reorder request
 */
export interface ColumnReorderRequest {
    columns: ColumnReorderItem[];
}

/**
 * Interface for column reorder item
 */
export interface ColumnReorderItem {
    id: number;
    order: number;
}

/**
 * Interface for column statistics
 */
export interface ColumnStatistics {
    total_values: number;
    empty_values: number;
    unique_values: number;
    value_distribution?: Record<string, number>;
}

/**
 * Interface for bulk field value update
 */
export interface BulkFieldValueUpdate {
    task_ids: number[];
    column_id: number;
    value: any;
}

/**
 * Interface for bulk field value delete
 */
export interface BulkFieldValueDelete {
    task_ids: number[];
    column_id: number;
}