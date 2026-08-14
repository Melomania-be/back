import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import Subtask from '#models/subtask'

export default class SubtasksController {

  // Ajouter une sous-tâche
  async store({ params, request, response, auth }: HttpContext) {
    const task = await Task.query()
      .where('id', params.task_id) // Attention au nom du paramètre (task_id) défini dans les routes
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    const title = request.input('title')

    const subtask = await task.related('subtasks').create({
      title: title,
      isCompleted: false,
    })

    return response.created(subtask)
  }

  // Mettre à jour (cocher/décocher) une sous-tâche
  async update({ params, request, response, auth }: HttpContext) {
    // 🔒 On vérifie l'appartenance via une jointure ou des requêtes successives
    await Task.query()
      .where('id', params.task_id)
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    const subtask = await Subtask.query()
      .where('id', params.id)
      .where('taskId', params.task_id)
      .firstOrFail()

    subtask.isCompleted = request.input('isCompleted')
    await subtask.save()

    return response.ok(subtask)
  }

  // Supprimer une sous-tâche
  async destroy({ params, response, auth }: HttpContext) {
    await Task.query()
      .where('id', params.task_id)
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    const subtask = await Subtask.query()
      .where('id', params.id)
      .where('taskId', params.task_id)
      .firstOrFail()

    await subtask.delete()
    return response.ok({ success: true })
  }
}
