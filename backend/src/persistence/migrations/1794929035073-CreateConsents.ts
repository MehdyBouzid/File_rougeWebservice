import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConsents1794929035073 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Prérequis : PATIENT et SOIGNANT, dont la migration relève d’Ethan.
    // Nullabilité et chronologie des dates restent ouvertes : aucun CHECK ajouté.
    await queryRunner.query(`
      CREATE TABLE public.consentement (
        id_consentement UUID NOT NULL,
        date_debut TIMESTAMP WITHOUT TIME ZONE,
        date_fin TIMESTAMP WITHOUT TIME ZONE,
        id_patient UUID NOT NULL,
        id_soignant UUID NOT NULL,
        CONSTRAINT pk_consentement PRIMARY KEY (id_consentement),
        CONSTRAINT fk_consentement_patient FOREIGN KEY (id_patient)
          REFERENCES public.patient (id_patient)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT fk_consentement_soignant FOREIGN KEY (id_soignant)
          REFERENCES public.soignant (id_soignant)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_consentement_patient
        ON public.consentement (id_patient)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_consentement_soignant
        ON public.consentement (id_soignant)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.consentement');
  }
}
