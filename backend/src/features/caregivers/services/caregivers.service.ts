import { Injectable } from '@nestjs/common';

// Écrire ici les règles métier ; garder les routes et les réponses HTTP dans le Controller.
// Une fois l’entité et la connexion prêtes, injecter Repository<Caregiver> via @InjectRepository(Caregiver).
// Utiliser ce repository TypeORM standard ; une classe personnalisée n’est pas nécessaire par défaut.
@Injectable()
export class CaregiversService {}
