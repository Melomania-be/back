import mail_template from '#models/mail_template'
import { createTemplateValidator } from '#validators/mail'
import { HttpContext } from '@adonisjs/core/http'

export default class TemplatesController {
  async getTemplates(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    let allTemplates = await mail_template
      .query()
      .where('is_default', false)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .select('*')
    return allTemplates
  }

  async createOrUpdateTemplate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createTemplateValidator)
    const organizationId = ctx.auth.user?.organizationId

    if (!data.id) {
      return await mail_template.create({ ...data, organizationId })
    }

    const template = await mail_template
      .query()
      .where('id', data.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    template.merge(data)
    await template.save()
    return template
  }

  async delete({ params, response, auth }: HttpContext) {
    const organizationId = auth.user?.organizationId

    let template = await mail_template
      .query()
      .where('id', params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .first()

    if (template) {
      await template.delete()
      return response.send('template deleted')
    }
    return response.send('template not found')
  }
}