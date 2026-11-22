import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'lot_mesure', schema: 'public' })
export class MeasurementBatch {
  @PrimaryColumn({ name: 'batch_id', type: 'varchar', length: 255 })
  batchId!: string;

  @Column({ name: 'id_patient', type: 'uuid' })
  idPatient!: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  createdAt!: Date;
}
