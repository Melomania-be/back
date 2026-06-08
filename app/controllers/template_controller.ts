import mail_template from '#models/mail_template'
import { createTemplateValidator } from '#validators/mail'
import { HttpContext } from '@adonisjs/core/http'

export default class TemplatesController {
  async getTemplates({ bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    return await mail_template.query().where('is_default', false).select('*')
  }

  async createOrUpdateTemplate(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights')
    const data = await ctx.request.validateUsing(createTemplateValidator)

    if (!data.id) return await mail_template.create({ ...data })
    const template = await mail_template.updateOrCreate({ id: data.id }, { ...data })
    await template.save()
    return template
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    let template = await mail_template.find(params.id)
    if (template) {
      await template.delete()
      return response.send('template deleted')
    }
    return response.send('template not found')
  }
}
