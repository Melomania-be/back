import Form from '#models/form'
import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'
import { HttpContext } from '@adonisjs/core/http'

export default class FormsController {
  async getFromProject({ params, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('view', project)

    return await Form.query().whereHas('registration', (query) => {
      query.whereHas('project', (subQuery) => {
        subQuery.where('id', project.id)
      })
    })
  }
}
