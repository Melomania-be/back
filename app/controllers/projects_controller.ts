// import type { HttpContext } from '@adonisjs/core/http'

import Project from '#models/project'
import { HttpContext } from '@adonisjs/core/http'
import { createProjectValidator } from '#validators/project'
import { simpleFilter, Filter } from '#services/simple_filter'
import Participant from '#models/participant'
import db from '@adonisjs/lucid/services/db'
import SectionGroup from '#models/section_group'
import Piece from '#models/piece'
import { DateTime } from 'luxon'

export default class ProjectsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Project.query()
      .preload('concerts')
      .preload('pieces')
      .preload('participants')
      .preload('registration')
      .preload('rehearsals')
      .preload('sectionGroup')
      .preload('callsheets')

    return await simpleFilter(ctx, Project, baseQuery, new Filter(Project, ['name']), [], {
      filtered: true,
      paginated: true,
      ordered: true,
    })
  }

  async getOne({ params }: HttpContext) {
    const data = await Project.query()
      .where('id', params.id)
      .preload('concerts')
      .preload('pieces', (query) => {
        query.preload('composer')
      })
      .preload('participants')
      .preload('registration')
      .preload('rehearsals')
      .preload('sectionGroup')
      .preload('callsheets')
      .preload('responsibles')
    return data
  }

  async getDashboard({ params }: HttpContext) {
    const data = await Project.query()
      .where('id', params.id)
      .preload('concerts', (query) => {
        query.limit(3).orderBy('date', 'desc')
      })
      .preload('participants')
      .preload('callsheets', (query) => {
        query.limit(3).orderBy('updated_at', 'desc')
      })
      .preload('registration')
      .preload('rehearsals')
      .preload('concerts')
      .preload('responsibles')
      .preload('pieces', (query) => {
        query.preload('composer').preload('folder', (subQuery) => {
          subQuery.preload('files')
        })
      })
      .preload('sectionGroup', (query) => {
        query.preload('sections')
      })

    const participantsNotValidated = await Participant.query()
      .preload('contact')
      .where('project_id', params.id)
      .andWhere('accepted', false)

    const participantsWithoutEmail = await Participant.query()
      .preload('contact')
      .where('project_id', params.id)
      .andWhere('accepted', true)
      .andWhereHas('contact', (subQuery) => {
        subQuery.whereNull('email').orWhere('email', '')
      })

    const participantsNotSeenCallsheet = await Participant.query()
      .preload('contact')
      .where('participants.project_id', params.id)
      .andWhere('accepted', true)
      .andWhere((subQuery) => {
        subQuery.where(
          'last_activity',
          '<',
          db
            .from('callsheets')
            .select('updated_at')
            .where('project_id', params.id)
            .andWhereNotNull('updated_at')
            .orderBy('updated_at', 'desc')
            .limit(1)
        )

        console.log(subQuery.toSQL())
      })

    return {
      data,
      participantsNotValidated,
      participantsWithoutEmail,
      participantsNotSeenCallsheet,
    }
  }

  async createOrUpdate(ctx: HttpContext) {
    console.log(ctx.request.all())

    const data = await ctx.request.validateUsing(createProjectValidator)

    console.log(data)

    let project: Project

    if (!data.id) {
      project = await Project.create({ name: data.name })
    } else {
      project = await Project.updateOrCreate({ id: data.id }, { name: data.name })
    }

    const sectionGroup = await SectionGroup.find(data.section_group_id)

    if (sectionGroup === null) {
      return ctx.response.status(400).send({ message: 'Section group not found' })
    }

    await project.related('sectionGroup').dissociate()
    await project.related('sectionGroup').associate(sectionGroup)

    const responsibles = await Participant.query().whereIn('id', data.responsibles_ids)

    await project.related('responsibles').detach()
    await project.related('responsibles').sync(responsibles.map((r) => r.id))

    const pieces = await Piece.query().whereIn('id', data.pieces_ids)

    await project.related('pieces').detach()
    await project.related('pieces').sync(pieces.map((p) => p.id))

    await project.related('concerts').query().delete()
    await project
      .related('concerts')
      .updateOrCreateMany(data.concerts.map((c) => ({ ...c, date: DateTime.fromJSDate(c.date) })))

    await project.related('rehearsals').query().delete()
    await project
      .related('rehearsals')
      .updateOrCreateMany(data.rehearsals.map((r) => ({ ...r, date: DateTime.fromJSDate(r.date) })))

    return await project.save()
  }

  async delete({ params }: HttpContext) {
    const project = await Project.find(params.id)

    if (project === null) {
      return { message: 'Project not found' }
    }

    await project.delete()

    return { message: 'Project deleted' }
  }
}
