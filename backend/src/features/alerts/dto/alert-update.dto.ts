import { IsDefined, IsIn } from 'class-validator';
import { AlertStatus } from '../entities/alert.entity';

export class AlertUpdateDto {
  @IsDefined()
  @IsIn([AlertStatus.TRAITEE], {
    message: 'statut doit avoir la valeur TRAITEE.',
  })
  statut!: AlertStatus.TRAITEE;
}
