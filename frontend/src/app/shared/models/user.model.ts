export type UserRole = 'Owner' | 'Admin' | 'Member';

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  onboardingCompleted: boolean;
  companyName: string | null;
  locale: 'en' | 'es' | 'fr';
}
