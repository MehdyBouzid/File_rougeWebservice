import type { PaginationLinks } from '../../../common/http/pagination.util';

export interface FollowedPatientDto {
  patientId: string;
  nom: string;
  prenom: string;
  dateNaissance: string | null;
}

export interface FollowedPatientPageDto {
  items: FollowedPatientDto[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  links: PaginationLinks;
}
