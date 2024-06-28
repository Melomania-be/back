// import type { HttpContext } from '@adonisjs/core/http'

import Project from '#models/project'
import { HttpContext } from '@adonisjs/core/http'
import { createProjectValidator } from '#validators/project'
import { getAll, Filter } from '#services/get_all_services'
import { ExtractModelRelations } from '@adonisjs/lucid/types/relations'

export default class ProjectsController {
  async getAll(ctx: HttpContext) {
    let baseQuery = Project.query()
    .preload('concerts')
    .preload('pieces')
    .preload('participants')
    .preload('registration')
    .preload('rehearsals')
    .preload('sectionGroup' as ExtractModelRelations<Project>)
    .preload('callsheets')

    return await getAll(ctx, Project, baseQuery, new Filter(Project, ['name']), [], {
      filtered: true,
      paginated: true,
      ordered: true,
    })
  }

  async getOne({ params }: HttpContext) {
    const data = await Project.query().where('id', params.id)
    .preload('concerts')
    .preload('pieces')
    .preload('participants')
    .preload('registration')
    .preload('rehearsals')
    .preload('sectionGroup' as ExtractModelRelations<Project>)
    .preload('callsheets')
    return data
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
