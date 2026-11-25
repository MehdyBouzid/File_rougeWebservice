import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'recevoir', schema: 'public' })
@Index('idx_recevoir_alerte', ['idAlerte'])
export class Recevoir {
  @PrimaryColumn({ name: 'id_soignant', type: 'uuid' })
  idSoignant!: string;

  @PrimaryColumn({ name: 'id_alerte', type: 'uuid' })
  idAlerte!: string;
}
