import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'suivre', schema: 'public' })
@Index('idx_suivre_soignant', ['idSoignant'])
export class Suivre {
  @PrimaryColumn({ name: 'id_patient', type: 'uuid' })
  idPatient!: string;

  @PrimaryColumn({ name: 'id_soignant', type: 'uuid' })
  idSoignant!: string;
}
