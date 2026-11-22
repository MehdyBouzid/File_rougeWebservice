import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'mesure', schema: 'public' })
export class Measurement {
  @PrimaryColumn({ name: 'id_mesure', type: 'uuid' })
  idMesure!: string;

  @Column({ name: 'horodatage', type: 'timestamptz' })
  horodatage!: Date;

  @Column({ name: 'frequence_cardiaque', type: 'smallint' })
  frequenceCardiaque!: number;

  @Column({ name: 'spo2', type: 'smallint' })
  spo2!: number;

  @Column({ name: 'pas', type: 'integer' })
  pas!: number;

  @Column({ name: 'id_patient', type: 'uuid' })
  idPatient!: string;
}
