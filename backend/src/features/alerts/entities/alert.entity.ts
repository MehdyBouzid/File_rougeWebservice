import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  TRAITEE = 'TRAITEE',
}

@Entity({ name: 'alerte', schema: 'public' })
export class Alert {
  @PrimaryColumn({ name: 'id_alerte', type: 'uuid' })
  idAlerte!: string;

  @Column({
    name: 'horodatage',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  horodatage!: Date;

  @Column({ name: 'valeur_seuil', type: 'numeric', precision: 6, scale: 2 })
  valeurSeuil!: string;

  @Column({
    name: 'statut',
    type: 'varchar',
    length: 20,
    default: AlertStatus.ACTIVE,
  })
  statut!: AlertStatus;

  @Column({ name: 'id_mesure', type: 'uuid' })
  idMesure!: string;

  @Column({ name: 'id_seuil', type: 'uuid' })
  idSeuil!: string;
}
