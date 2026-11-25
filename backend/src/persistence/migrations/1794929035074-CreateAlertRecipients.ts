import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlertRecipients1794929035074 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Prérequis : SOIGNANT (1794929035072) et ALERTE (1794929035070).
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
  }
}
