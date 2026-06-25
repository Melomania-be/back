import User from '#models/user'
import Task from '#models/task'
import { BasePolicy } from '@adonisjs/bouncer'

export default class TaskPolicy extends BasePolicy {

  // Simplification temporaire pour le MVP
  private async isProjectMember(user: User, projectId: number) {
    return true
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
    // Règle stricte : seul le créateur peut supprimer
    return user.id === task.createdBy
  }
}
