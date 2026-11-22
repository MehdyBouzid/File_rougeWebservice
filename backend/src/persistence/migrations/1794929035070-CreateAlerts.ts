import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAlerts1794929035070 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.alerte (
        id_alerte UUID NOT NULL,
        horodatage TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        valeur_seuil NUMERIC(6, 2) NOT NULL,
        statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        id_mesure UUID NOT NULL,
        id_seuil UUID NOT NULL,
        CONSTRAINT pk_alerte PRIMARY KEY (id_alerte),
        CONSTRAINT fk_alerte_mesure FOREIGN KEY (id_mesure)
          REFERENCES public.mesure (id_mesure)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT fk_alerte_seuil FOREIGN KEY (id_seuil)
          REFERENCES public.seuil (id_seuil)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT chk_alerte_statut CHECK (statut IN ('ACTIVE', 'TRAITEE'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alerte_mesure
        ON public.alerte (id_mesure)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alerte_seuil
        ON public.alerte (id_seuil)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_alerte_statut_horodatage
        ON public.alerte (statut, horodatage DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.alerte');
  }
}
