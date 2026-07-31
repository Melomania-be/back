import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import Subtask from '#models/subtask'
import TaskComment from '#models/task_comment'

export default class TasksController {

  // 1. Récupérer les tâches (avec filtres optionnels)
  async index({ request }: HttpContext) {
    const { projectId, eventId, sectionId } = request.qs()

    const query = Task.query()
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
    })

    return task
  }

  // 3. Voir une seule tâche en détail
  async show({ params }: HttpContext) {
    return await Task.query()
      .where('id', params.id)
      .preload('assignee')
      .preload('creator')
      .preload('section')
      .preload('piece')
      .preload('subtasks') // 👈 On n'oublie pas de charger les sous-tâches
      .preload('comments', (commentsQuery) => {
        commentsQuery.preload('user')
      })
      .firstOrFail()
  }

  // 4. LE CHEVAL DE TROIE : Gère les mises à jour ET les sous-tâches/commentaires !
  async update({ params, request, response, auth }: HttpContext) {
    // On regarde si Svelte nous envoie une action spécifique
    const action = request.input('_action')

    // --- SOUS-TÂCHES ---
    if (action === 'add_subtask') {
      const task = await Task.findOrFail(params.id)
      const subtask = await task.related('subtasks').create({
        title: request.input('title'),
        isCompleted: false,
      })
      return response.created(subtask)
    }

    if (action === 'toggle_subtask') {
      const subtask = await Subtask.findOrFail(request.input('subtaskId'))
      subtask.isCompleted = request.input('isCompleted')
      await subtask.save()
      return response.ok(subtask)
    }

    if (action === 'delete_subtask') {
      const subtask = await Subtask.findOrFail(request.input('subtaskId'))
      await subtask.delete()
      return response.ok({ success: true })
    }

    // --- COMMENTAIRES ---
    if (action === 'add_comment') {
      const task = await Task.findOrFail(params.id)
      const comment = await task.related('comments').create({
        content: request.input('content'),
        userId: auth.user!.id,
      })
      await comment.load('user') // Charge les infos user pour le front
      return response.created(comment)
    }

    if (action === 'delete_comment') {
      const comment = await TaskComment.findOrFail(request.input('commentId'))
      await comment.delete()
      return response.ok({ success: true })
    }

    // --- SI AUCUNE ACTION SPÉCIFIQUE : COMPORTEMENT NORMAL DE LA TÂCHE ---
    const task = await Task.findOrFail(params.id)
    const payload = await request.validateUsing(updateTaskValidator)

    task.merge(payload)
    await task.save()

    return task
  }

  // 5. Supprimer une tâche
  async destroy({ params, response }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    await task.delete()

    return response.noContent()
  }
}
