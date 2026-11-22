import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'soignant', schema: 'public' })
export class Caregiver {
  @PrimaryColumn({ name: 'id_soignant', type: 'uuid' })
  idSoignant!: string;

  @Column({ name: 'nom', type: 'varchar', length: 100, nullable: true })
  nom!: string | null;

  @Column({ name: 'prenom', type: 'varchar', length: 100, nullable: true })
  prenom!: string | null;

  @Column({ name: 'specialite', type: 'varchar', length: 100, nullable: true })
  specialite!: string | null;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
  })
  email!: string | null;
}
