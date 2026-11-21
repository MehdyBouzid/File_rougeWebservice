import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThresholds1794929035069 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.seuil (
        id_seuil UUID NOT NULL,
        type_mesure VARCHAR(20) NOT NULL,
        valeur_min NUMERIC(6, 2) NOT NULL,
        valeur_max NUMERIC(6, 2) NOT NULL,
        actif BOOLEAN NOT NULL DEFAULT TRUE,
        id_patient UUID NOT NULL,
        CONSTRAINT pk_seuil PRIMARY KEY (id_seuil),
        CONSTRAINT fk_seuil_patient FOREIGN KEY (id_patient)
          REFERENCES public.patient (id_patient)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT chk_seuil_type_mesure CHECK (
          type_mesure IN ('FREQUENCE_CARDIAQUE', 'SPO2', 'PAS')
        ),
        CONSTRAINT chk_seuil_bornes CHECK (valeur_min <= valeur_max)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_seuil_actif_patient_type
        ON public.seuil (id_patient, type_mesure)
        WHERE actif
    `);

    // Le GET de la collection inclut aussi les seuils inactifs.
    await queryRunner.query(`
      CREATE INDEX idx_seuil_patient ON public.seuil (id_patient)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Les index de la table sont supprimés avec elle ; aucune cascade vers ALERTE.
    await queryRunner.query('DROP TABLE public.seuil');
  }
}
