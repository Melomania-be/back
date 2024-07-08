// import type { HttpContext } from '@adonisjs/core/http'

import Project from '#models/project'
import { HttpContext } from '@adonisjs/core/http'
import { createProjectValidator } from '#validators/project'
import { simpleFilter, Filter } from '#services/simple_filter'
import Participant from '#models/participant'
import db from '@adonisjs/lucid/services/db'

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
      .preload('pieces')
      .preload('participants')
      .preload('registration')
      .preload('rehearsals')
      .preload('sectionGroup')
      .preload('callsheets')
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

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createProjectValidator)

    const existingProject = await Project.query().where('name', data.name).first()

    if (existingProject) {
      return ctx.response.status(400).send({ message: 'Project with this name already exists.' })
    }

    return await Project.create(data)
  }
}
