import type { MigrationInterface } from 'typeorm';

export class CreateCaregivers1794929035072 implements MigrationInterface {
  public up(): Promise<void> {
    // Compléter après validation du schéma ; aucune instruction SQL pour le moment.
    throw new Error('Squelette CreateCaregivers à compléter avant exécution.');
  }

  public down(): Promise<void> {
    // Définir un retour arrière uniquement s’il est sûr pour les données.
    throw new Error(
      'Retour arrière CreateCaregivers à définir avant exécution.',
    );
  }
}
