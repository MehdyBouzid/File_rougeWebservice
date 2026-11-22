import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCaregivers1794929035072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      CREATE TABLE public.recevoir (
        id_soignant UUID NOT NULL,
        id_alerte UUID NOT NULL,
        CONSTRAINT pk_recevoir PRIMARY KEY (id_soignant, id_alerte),
        CONSTRAINT fk_recevoir_soignant FOREIGN KEY (id_soignant)
          REFERENCES public.soignant (id_soignant)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT fk_recevoir_alerte FOREIGN KEY (id_alerte)
          REFERENCES public.alerte (id_alerte)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_recevoir_alerte
        ON public.recevoir (id_alerte)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.recevoir');
    await queryRunner.query('DROP TABLE public.suivre');
    await queryRunner.query('DROP TABLE public.soignant');
  }
}
