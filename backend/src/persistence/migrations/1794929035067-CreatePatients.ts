import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePatients1794929035067 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Le MPD ne précise pas la nullabilité des attributs hors clé primaire.
    // Aucun NOT NULL supplémentaire ni générateur d’UUID n’est imposé ici.
    await queryRunner.query(`
      CREATE TABLE public.patient (
        id_patient UUID NOT NULL,
        nom VARCHAR(100),
        prenom VARCHAR(100),
        date_naissance DATE,
        CONSTRAINT pk_patient PRIMARY KEY (id_patient)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Sans CASCADE : les tables dépendantes doivent être retirées avant PATIENT.
    await queryRunner.query('DROP TABLE public.patient');
  }
}
