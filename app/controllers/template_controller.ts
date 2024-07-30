import mail_template from '#models/mail_template'
import { createTemplateValidator } from '#validators/mail'
import { HttpContext } from '@adonisjs/core/http'

export default class TemplatesController {
  async getTemplates() {
    let allTemplates = await mail_template.query().select('*')
    return allTemplates
  }

  async createOrUpdateTemplate(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createTemplateValidator)

    if (!data.id) {
      return await mail_template.create({ ...data })
    }

    const template = await mail_template.updateOrCreate({ id: data.id }, { ...data })

    await template.save()
    return template
  }

  async delete({ params, response }: HttpContext) {
    let template = await mail_template.find(params.id)
    if (template) {
      await template.delete()
      return response.send('template deleted')
    }
    return response.send('template not found')
  }
}
