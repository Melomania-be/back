// app/policies/project_policy.ts
import { BasePolicy } from '@adonisjs/bouncer'
import User from '#models/user'
import Project from '#models/project'

export default class ProjectPolicy extends BasePolicy {
  // Règle pour voir un projet
  async view(user: User, project: Project): Promise<boolean> {
    return user.id === project.user_id
  }

  // Règle pour modifier
  async update(user: User, project: Project): Promise<boolean> {
    return user.id === project.user_id
  }

  // Règle pour supprimer
  async delete(user: User, project: Project): Promise<boolean> {
    return user.id === project.user_id
  }
}
