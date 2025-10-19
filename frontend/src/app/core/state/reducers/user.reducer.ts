import { UserState, initialUserState } from './index';

export type UserAction =
  | { type: 'user/login'; payload: { id: string; displayName: string } }
  | { type: 'user/logout' };

export function userReducer(state: UserState = initialUserState, action: UserAction): UserState {
  switch (action.type) {
    case 'user/login':
      return { ...state, ...action.payload };
    case 'user/logout':
      return { ...initialUserState };
    default:
      return state;
  }
}
