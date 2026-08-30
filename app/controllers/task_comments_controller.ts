import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import TaskComment from '#models/task_comment'

export default class TaskCommentsController {

  // Ajouter un commentaire
  async store({ params, request, response, auth }: HttpContext) {
    const task = await Task.query()
      .where('id', params.task_id)
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    const content = request.input('content')

    const comment = await task.related('comments').create({
      content: content,
      userId: auth.user!.id,
    })

    await comment.load('user') // Charge les infos user pour le front
    return response.created(comment)
  }

  // Supprimer un commentaire
  async destroy({ params, response, auth }: HttpContext) {
    await Task.query()
      .where('id', params.task_id)
      .where('organizationId', auth.user!.organizationId!)
      .firstOrFail()

    const comment = await TaskComment.query()
      .where('id', params.id)
      .where('taskId', params.task_id)
      .firstOrFail()

    await comment.delete()
    return response.ok({ success: true })
  }
}
