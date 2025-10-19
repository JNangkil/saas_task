import { LayoutState, initialLayoutState } from './index';

export type LayoutAction =
  | { type: 'layout/toggleSidebar' }
  | { type: 'layout/setSidebarCollapsed'; payload: boolean };

export function layoutReducer(state: LayoutState = initialLayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case 'layout/toggleSidebar':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'layout/setSidebarCollapsed':
      return { ...state, sidebarCollapsed: action.payload };
    default:
      return state;
  }
}
