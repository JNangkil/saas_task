export interface AppState {
  layout: LayoutState;
  user: UserState;
}

export interface LayoutState {
  sidebarCollapsed: boolean;
}

export interface UserState {
  id: string;
  displayName: string;
}

export const initialLayoutState: LayoutState = {
  sidebarCollapsed: false
};

export const initialUserState: UserState = {
  id: '',
  displayName: ''
};
