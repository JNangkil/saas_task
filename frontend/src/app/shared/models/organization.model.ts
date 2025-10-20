export interface Organization {
  id: string;
  name: string;
  logoUrl: string | null;
  defaultLocale: 'en' | 'es' | 'fr';
  createdAt: string;
  membershipRole: 'Owner' | 'Admin' | 'Member';
}
