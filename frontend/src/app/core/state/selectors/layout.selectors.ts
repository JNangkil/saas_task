import { AppState } from '../reducers';

export const selectLayoutState = (state: AppState) => state.layout;

export const selectIsSidebarCollapsed = (state: AppState) => selectLayoutState(state).sidebarCollapsed;
