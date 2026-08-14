import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

export default class TasksController {

  // 1. Récupérer les tâches
  async index({ request, auth }: HttpContext) {
    const { projectId, eventId, sectionId } = request.qs()

    const query = Task.query()
      .where('organizationId', auth.user!.organizationId!)
      .preload('assignee')
      .preload('creator')
      .preload('section')
      .preload('piece')
      .preload('comments', (commentsQuery) => {
        commentsQuery.preload('user')
      })
      .orderBy('createdAt', 'desc')

    if (projectId) query.where('projectId', projectId)
    if (eventId) query.where('eventId', eventId)
    if (sectionId) query.where('sectionId', sectionId)

    return await query
  }

  // 2. Créer une tâche
  async store({ request, auth }: HttpContext) {
    const payload = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      ...payload,
      createdBy: auth.user!.id,
      organizationId: auth.user!.organizationId!,
    })

    return task
  }

  // 3. Voir une seule tâche en détail
  async show({ params, auth }: HttpContext) {
    return await Task.query()
      .where('id', params.id)
      .where('organizationId', auth.user!.organizationId!) // 👈 Ajout du "!" ici
      .preload('assignee')
      .preload('creator')
      .preload('section')
      .preload('piece')
      .preload('subtasks')
      .preload('comments', (commentsQuery) => {
        commentsQuery.preload('user')
      })
      .firstOrFail()
  }

  // 4. Mettre à jour une tâche
  async update({ params, request, auth }: HttpContext) {
    const task = await Task.query()
      .where('id', params.id)
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    const payload = await request.validateUsing(updateTaskValidator)

    task.merge(payload)
    await task.save()

    return task
  }

  // 5. Supprimer une tâche
  async destroy({ params, response, auth }: HttpContext) {
    const task = await Task.query()
      .where('id', params.id)
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    await task.delete()

    return response.noContent()
  }
}
