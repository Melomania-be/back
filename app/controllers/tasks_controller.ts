import Task from '#models/task'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class TasksController {

  // ==============================================================================
  // 1. LISTER LES TÂCHES (PAGINATION, FILTRES, CORBEILLE)
  // ==============================================================================
  async index({ request, response, auth }: HttpContext) {
    await auth.authenticate()

    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const status = request.input('status')
    const priority = request.input('priority')
    const search = request.input('search')
    const showDeleted = request.input('trashed', false) // ?trashed=true pour voir la corbeille

    const query = Task.query().preload('user') // Charge les infos du créateur

    // Gestion du Soft Delete : par défaut on cache les tâches supprimées
    if (!showDeleted) {
      query.whereNull('deleted_at')
    } else {
      query.whereNotNull('deleted_at')
    }

    if (status) query.where('status', status)
    if (priority) query.where('priority', priority)
    if (search) query.whereILike('title', `%${search}%`)

    const tasks = await query.orderBy('created_at', 'desc').paginate(page, limit)
    return response.ok(tasks)
  }

  // ==============================================================================
  // 2. RÉCUPÉRER UNE SEULE TÂCHE (SHOW)
  // ==============================================================================
  async show({ params, response, auth }: HttpContext) {
    await auth.authenticate()

    try {
      // On s'assure qu'elle n'est pas dans la corbeille
      const task = await Task.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
      return response.ok(task)
    } catch (error) {
      return response.status(404).json({ error: 'Task not found or deleted' })
    }
  }

  // ==============================================================================
  // 3. CRÉER UNE TÂCHE (AVEC PRIORITÉ ET UTILISATEUR)
  // ==============================================================================
  async store({ request, response, auth }: HttpContext) {
    const user = await auth.authenticate()

    const payload = request.only(['title', 'description', 'status', 'priority', 'due_date'])

    if (!payload.title) {
      return response.badRequest({ error: 'Title is required' })
    }

    const task = new Task()
    task.title = payload.title
    task.description = payload.description || null
    task.status = payload.status || 'pending'
    task.priority = payload.priority || 'medium'
    task.userId = user.id // Liaison avec le créateur

    if (payload.due_date) {
      task.dueDate = DateTime.fromISO(payload.due_date)
    }

    await task.save()
    return response.created({ message: 'Task created successfully', task })
  }

  // ==============================================================================
  // 4. METTRE À JOUR UNE TÂCHE COMPLÈTEMENT
  // ==============================================================================
  async update({ params, request, response, auth }: HttpContext) {
    await auth.authenticate()

    try {
      const task = await Task.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
      const payload = request.only(['title', 'description', 'status', 'priority', 'due_date'])

      if (payload.title) task.title = payload.title
      if (payload.description !== undefined) task.description = payload.description
      if (payload.status) task.status = payload.status
      if (payload.priority) task.priority = payload.priority

      if (payload.due_date) {
        task.dueDate = DateTime.fromISO(payload.due_date)
      } else if (payload.due_date === null) {
        task.dueDate = null as any
      }

      await task.save()
      return response.ok({ message: 'Task updated successfully', task })
    } catch (error) {
      return response.status(404).json({ error: 'Task not found or deleted' })
    }
  }

  // ==============================================================================
  // 5. ACTION RAPIDE : CHANGER UNIQUEMENT LE STATUT (PATCH)
  // ==============================================================================
  async patchStatus({ params, request, response, auth }: HttpContext) {
    await auth.authenticate()

    try {
      const task = await Task.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
      const status = request.input('status')

      if (!status) {
        return response.badRequest({ error: 'Status is required' })
      }

      task.status = status
      await task.save()
      return response.ok({ message: 'Task status updated', task })
    } catch (error) {
      return response.status(404).json({ error: 'Task not found' })
    }
  }

  // ==============================================================================
  // 6. SUPPRIMER UNE TÂCHE (SOFT DELETE = CORBEILLE)
  // ==============================================================================
  async destroy({ params, response, auth }: HttpContext) {
    await auth.authenticate()

    try {
      const task = await Task.findOrFail(params.id)
      task.deletedAt = DateTime.now()
      await task.save()

      return response.ok({ message: 'Task moved to trash' })
    } catch (error) {
      return response.status(404).json({ error: 'Task not found' })
    }
  }

  // ==============================================================================
  // 7. RESTAURER UNE TÂCHE DEPUIS LA CORBEILLE
  // ==============================================================================
  async restore({ params, response, auth }: HttpContext) {
    await auth.authenticate()

    try {
      const task = await Task.query().where('id', params.id).whereNotNull('deleted_at').firstOrFail()
      task.deletedAt = null as any
      await task.save()

      return response.ok({ message: 'Task restored successfully', task })
    } catch (error) {
      return response.status(404).json({ error: 'Task not found in trash' })
    }
  }

  // ==============================================================================
  // 8. STATISTIQUES DES TÂCHES (DASHBOARD)
  // ==============================================================================
  async stats({ response, auth }: HttpContext) {
    await auth.authenticate()

    const stats = await db.from('tasks')
      .whereNull('deleted_at')
      .select('status')
      .count('* as total')
      .groupBy('status')

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.total)
      return acc
    }, {} as Record<string, number>)

    return response.ok({ message: 'Task statistics retrieved', data: formattedStats })
  }
}