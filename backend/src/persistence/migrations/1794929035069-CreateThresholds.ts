import type { MigrationInterface } from 'typeorm';

export class CreateThresholds1794929035069 implements MigrationInterface {
  public up(): Promise<void> {
    // Compléter après validation du schéma ; aucune instruction SQL pour le moment.
    throw new Error('Squelette CreateThresholds à compléter avant exécution.');
  }

  public down(): Promise<void> {
    // Définir un retour arrière uniquement s’il est sûr pour les données.
    throw new Error(
      'Retour arrière CreateThresholds à définir avant exécution.',
    );
  }
}
