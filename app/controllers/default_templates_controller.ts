import MailTemplate from '#models/mail_template'
import { HttpContext } from '@adonisjs/core/http'

export default class DefaultTemplatesController {

  async getDefaultTemplates({ bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    return await MailTemplate.query().where('is_default', true).select('*')
  }

  async editDefaultTemplate({ request, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')

    const { id, name, content } = request.only(['id', 'name', 'content'])
    let template = await MailTemplate.find(id)

    if (template) {
      template.name = name
      template.content = content
      await template.save()
      return { success: true }
    }

    return { success: false, message: 'Template not found' }
  }
}