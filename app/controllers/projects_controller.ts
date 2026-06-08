import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'
import { HttpContext } from '@adonisjs/core/http'
import { createProjectValidator } from '#validators/project'
import { simpleFilter } from 'adonisjs-filters'
import Participant from '#models/participant'
import db from '@adonisjs/lucid/services/db'
import SectionGroup from '#models/section_group'
import { DateTime } from 'luxon'
import Contact from '#models/contact'
import Folder from '#models/folder'
import fs from 'node:fs/promises'

export default class ProjectsController {

  async getAll(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights') // Visualiser la liste de TOUS les projets nécessite admin
    let baseQuery = Project.query().preload('concerts').preload('pieces').preload('participants').preload('registration').preload('rehearsals').preload('sectionGroup').preload('callsheets')
    return await simpleFilter(ctx, baseQuery, ['name'], [], { filtered: true, paginated: true, ordered: true })
  }

  async getOne({ params, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('view', project)
    await this.syncProjectFiles(project.id)

    const data = await Project.query().where('id', project.id).preload('concerts').preload('pieces', (q) => { q.preload('composer').preload('folder', (sq) => sq.preload('files')).preload('files').pivotColumns(['order', 'material_id', 'material_specified']).orderBy('order', 'asc') }).preload('participants').preload('registration').preload('rehearsals').preload('sectionGroup', (q) => { q.preload('sections', (sq) => sq.preload('instruments')) }).preload('callsheets').preload('responsibles').preload('folder', (q) => q.preload('files')).firstOrFail()
    const serializedData = data.serialize()

    if (serializedData.pieces) {
      serializedData.pieces = serializedData.pieces.map((piece: any, index: number) => {
        const originalPiece = data.pieces[index]
        return { ...piece, pivot_material_id: originalPiece?.$extras?.pivot_material_id || null, pivot_material_specified: Boolean(originalPiece?.$extras?.pivot_material_specified || false), pivot_order: originalPiece?.$extras?.pivot_order || 0 }
      })
    }
    return serializedData
  }

  async getDashboard({ params, bouncer }: HttpContext) {
    const projectModel = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('view', projectModel)
    await this.syncProjectFiles(projectModel.id)

    const data = await Project.query().where('id', projectModel.id).preload('concerts', (q) => q.limit(3).orderBy('start_date', 'desc')).preload('participants', (q) => q.preload('contact').preload('section')).preload('callsheets', (q) => q.limit(3).orderBy('updated_at', 'desc')).preload('registration', (q) => q.preload('content').preload('form')).preload('rehearsals', (q) => q.orderBy('start_date', 'asc')).preload('responsibles').preload('pieces', (q) => { q.preload('composer').preload('typeOfPiece').preload('folder', (sq) => sq.preload('files')).preload('files').pivotColumns(['order']).orderBy('order', 'asc') }).preload('sectionGroup', (q) => { q.preload('sections', (sq) => sq.preload('instruments').pivotColumns(['order']).orderBy('order', 'asc')) }).preload('folder', (q) => q.preload('files')).firstOrFail()

    const participantsNotValidated = await Participant.query().preload('contact').preload('section').where('project_id', projectModel.id).andWhere('accepted', false).orderBy('created_at', 'desc')
    const participantsWithoutEmail = await Participant.query().preload('contact').preload('section').where('project_id', projectModel.id).andWhere('accepted', true).andWhereHas('contact', (sq) => { sq.whereNull('email').orWhere('email', '').orWhere('email', 'NOT LIKE', '%@%') }).orderBy('created_at', 'desc')
    const participantsNotSeenCallsheet = await Participant.query().preload('contact').preload('section').where('participants.project_id', projectModel.id).andWhere('accepted', true).andWhere((sq) => { sq.whereNull('last_activity').orWhere('last_activity', '<', db.from('callsheets').select('updated_at').where('project_id', projectModel.id).andWhereNotNull('updated_at').orderBy('updated_at', 'desc').limit(1)) }).orderBy('last_activity', 'asc')

    return { data: projectModel.serialize(), participantsNotValidated, participantsWithoutEmail, participantsNotSeenCallsheet }
  }

  async createOrUpdate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createProjectValidator)
    let project: Project

    if (!data.id) {
      await (ctx.bouncer as any).authorize('adminRights') // Création par admin
      project = await Project.create({ name: data.name })
    } else {
      project = await Project.findOrFail(data.id)
      await ctx.bouncer.with(ProjectPolicy).authorize('update', project)
      project.name = data.name
      await project.save()
    }

    const sectionGroup = await SectionGroup.findOrFail(data.section_group_id)
    await project.related('sectionGroup').dissociate()
    await project.related('sectionGroup').associate(sectionGroup)

    const responsibles = await Contact.findMany(data.responsibles_ids)
    await project.related('responsibles').detach()
    await project.related('responsibles').attach(responsibles.map((r) => r.id))

    const pivotData = data.pieces.reduce((acc: Record<number, { order: number }>, piece) => { acc[piece.id] = { order: piece.pivot_order }; return acc }, {})
    await project.related('pieces').detach()
    await project.related('pieces').sync(pivotData)

    // Logique simplifiée pour gain de place (les boucles concerts/rehearsals sont conservées telles quelles dans ton vrai fichier)
    // ...
    return project
  }

  async delete({ params, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('delete', project)
    await project.delete()
    return { message: 'Project deleted' }
  }

  async getAttendance({ params, bouncer }: HttpContext) {
    const projectModel = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('view', projectModel)

    const project = await Project.query().where('id', projectModel.id).preload('rehearsals', (q) => q.orderBy('start_date', 'asc').preload('participants', (pq) => pq.pivotColumns(['comment']))).preload('concerts', (q) => q.orderBy('start_date', 'asc').preload('participants', (pq) => pq.pivotColumns(['comment']))).preload('participants', (q) => q.where('accepted', true).preload('contact').preload('section')).preload('sectionGroup', (q) => q.preload('sections', (sq) => sq.pivotColumns(['order']).orderBy('order', 'asc'))).firstOrFail()
    return { ...project.serialize(), participants: project.participants } // Note : conserver la logique de tri côté JS de ton controller initial
  }

  private async syncProjectFiles(projectId: number) {
    try {
      const dbFiles = await db.from('files').where('project_id', projectId).whereNotNull('path')
      for (const file of dbFiles) { try { await fs.access(file.path) } catch (error) { await db.from('files').where('id', file.id).delete() } }
    } catch (error) {}
  }
}
