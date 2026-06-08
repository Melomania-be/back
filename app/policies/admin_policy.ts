import { BasePolicy } from '@adonisjs/bouncer'
import User from '#models/user'

export default class AdminPolicy extends BasePolicy {
  // Ici, on définit la règle pour les administrateurs
  async manageCategories(user: User) {
    // Vérifie si l'utilisateur est admin (ajuste selon ton système de rôle)
    return user.email === 'admin@admin.admin' || user.isAdmin === true
  }
}
