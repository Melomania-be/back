import Form from '#models/form'
import type { HttpContext } from '@adonisjs/core/http'

export default class FormsController {
  async getFromProject(ctx: HttpContext) {
    const { id } = ctx.params

    return await Form.query().whereHas('registration', (query) => {
      query.whereHas('project', (subQuery) => {
        subQuery.where('id', id)
      })
    })
  }
}
