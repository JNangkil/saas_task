export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  defaultLocale: 'en' | 'es' | 'fr';
  createdAt: string;
}
