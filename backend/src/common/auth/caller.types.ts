export type CallerScope = 'montre' | 'patient' | 'soignant';

export interface AuthenticatedCaller {
  id: string;
  scopes: CallerScope[];
  authorizedPatientIds?: string[];
}
