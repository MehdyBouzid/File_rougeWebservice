import type { PaginationLinks } from '../../../common/http/pagination.util';
import type { MeasurementType } from '../../../common/types/measurement-type.enum';
import type { AlertStatus } from '../entities/alert.entity';

export interface AlertSummaryDto {
  alertId: string;
  patientId: string;
  nomPatient: string;
  prenomPatient: string;
  typeMesure: MeasurementType;
  horodatage: string;
  statut: AlertStatus;
}

export interface AlertPageDto {
  items: AlertSummaryDto[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  links: PaginationLinks;
}

export interface AlertDetailDto {
  alertId: string;
  patientId: string;
  typeMesure: MeasurementType;
  valeurMesuree: number;
  valeurSeuil: number;
  statut: AlertStatus;
  horodatage: string;
}
