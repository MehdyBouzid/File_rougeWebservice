import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCaregivers1794929035072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Prérequis : PATIENT (1794929035067-CreatePatients) pour la table d’association SUIVRE.
    // Le MPD ne précise pas la nullabilité des attributs hors clé primaire.
    await queryRunner.query(`
      CREATE TABLE public.soignant (
        id_soignant UUID NOT NULL,
        nom VARCHAR(100),
        prenom VARCHAR(100),
        specialite VARCHAR(100),
        email VARCHAR(255),
        CONSTRAINT pk_soignant PRIMARY KEY (id_soignant),
        CONSTRAINT uq_soignant_email UNIQUE (email)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE public.suivre (
        id_patient UUID NOT NULL,
        id_soignant UUID NOT NULL,
        CONSTRAINT pk_suivre PRIMARY KEY (id_patient, id_soignant),
        CONSTRAINT fk_suivre_patient FOREIGN KEY (id_patient)
          REFERENCES public.patient (id_patient)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT fk_suivre_soignant FOREIGN KEY (id_soignant)
          REFERENCES public.soignant (id_soignant)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_suivre_soignant
        ON public.suivre (id_soignant)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Sans CASCADE : consentement et recevoir doivent être retirés avant SOIGNANT.
    await queryRunner.query('DROP TABLE public.suivre');
    await queryRunner.query('DROP TABLE public.soignant');
  }
}
