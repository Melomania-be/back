import User from '#models/user'
import Task from '#models/task'
import { BasePolicy } from '@adonisjs/bouncer'

export default class TaskPolicy extends BasePolicy {
  // Fonction utilitaire pour vérifier l'accès au projet
// il faut adapter cette fonction selon la structure de votre application et la relation entre les utilisateurs et les projets
  private async isProjectMember(user: User, projectId: number) {
    const project = await user.related('projects').query().where('projects.id', projectId).first()
    return !!project
  }

  async viewList(user: User, projectId: number) {
    return this.isProjectMember(user, projectId)
  }

  async create(user: User, projectId: number) {
    return this.isProjectMember(user, projectId)
  }

  async update(user: User, task: Task) {
    return this.isProjectMember(user, task.projectId)
  }

  async delete(user: User, task: Task) {
    // Règle stricte : seul le créateur de la tâche peut la supprimer
    return user.id === task.createdBy
  }
}
