import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import { createTaskValidator, updateTaskValidator } from '#validators/task_validator'
import TaskPolicy from '#policies/task_policy'

export default class TasksController {

  async index({ request, bouncer }: HttpContext) {
    const projectId = request.input('project_id')

    // 1. Autorisation via Bouncer
    await bouncer.with(TaskPolicy).authorize('viewList', projectId)

    // 2. Fetch des tâches
    return Task.query().where('projectId', projectId).preload('assignee')
  }

  async store({ request, auth, bouncer }: HttpContext) {
    // 1. Validation
    const payload = await request.validateUsing(createTaskValidator)

    // 2. Autorisation
    await bouncer.with(TaskPolicy).authorize('create', payload.projectId)

    // 3. Création
    const task = await Task.create({
      ...payload,
      createdBy: auth.user!.id
    })

    return task
  }

  async update({ params, request, bouncer }: HttpContext) {
    const task = await Task.findOrFail(params.id)

    // 1. Autorisation
    await bouncer.with(TaskPolicy).authorize('update', task)

    // 2. Validation
    const payload = await request.validateUsing(updateTaskValidator)

    // 3. Mise à jour
    task.merge(payload)
    await task.save()

    return task
  }

  async destroy({ params, bouncer }: HttpContext) {
    const task = await Task.findOrFail(params.id)

    // 1. Autorisation
    await bouncer.with(TaskPolicy).authorize('delete', task)

    // 2. Suppression
    await task.delete()
    return { message: 'Tâche supprimée avec succès' }
  }
}
