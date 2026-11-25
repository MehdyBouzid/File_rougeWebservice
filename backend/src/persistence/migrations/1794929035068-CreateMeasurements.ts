import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeasurements1794929035068 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.mesure (
        id_mesure UUID NOT NULL,
        horodatage TIMESTAMP WITH TIME ZONE NOT NULL,
        frequence_cardiaque SMALLINT NOT NULL,
        spo2 SMALLINT NOT NULL,
        pas INTEGER NOT NULL,
        id_patient UUID NOT NULL,
        CONSTRAINT pk_mesure PRIMARY KEY (id_mesure),
        CONSTRAINT fk_mesure_patient FOREIGN KEY (id_patient)
          REFERENCES public.patient (id_patient)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT chk_mesure_fc CHECK (frequence_cardiaque >= 0),
        CONSTRAINT chk_mesure_spo2 CHECK (spo2 >= 0 AND spo2 <= 100),
        CONSTRAINT chk_mesure_pas CHECK (pas >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_mesure_patient_horodatage
        ON public.mesure (id_patient, horodatage DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE public.lot_mesure (
        batch_id VARCHAR(255) NOT NULL,
        id_patient UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_lot_mesure PRIMARY KEY (batch_id),
        CONSTRAINT fk_lot_mesure_patient FOREIGN KEY (id_patient)
          REFERENCES public.patient (id_patient)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_lot_mesure_patient
        ON public.lot_mesure (id_patient)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.lot_mesure');
    await queryRunner.query('DROP TABLE public.mesure');
  }
}
