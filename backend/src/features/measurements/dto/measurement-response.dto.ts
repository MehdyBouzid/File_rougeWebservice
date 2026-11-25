import type { PaginationLinks } from '../../../common/http/pagination.util';

export interface BatchReceiptDto {
  batchId: string;
  patientId: string;
  count: number;
}

export interface MeasurementResponseDto {
  horodatage: string;
  frequenceCardiaque: number;
  spo2: number;
  pas: number;
}

export interface MeasurementPageDto {
  items: MeasurementResponseDto[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  links: PaginationLinks;
}
