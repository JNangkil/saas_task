import { AppState } from '../reducers';

export const selectUserState = (state: AppState) => state.user;

export const selectCurrentUserName = (state: AppState) => selectUserState(state).displayName;
