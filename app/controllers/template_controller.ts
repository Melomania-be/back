import mail from '#config/mail'
import TemplatePreparation from '#mails/template_preparation'
import Callsheet from '#models/callsheet'
import Contact from '#models/contact'
import mail_template from '#models/mail_template'
import { createTemplateValidator } from '#validators/mail'
import { HttpContext } from '@adonisjs/core/http'

export default class TemplatesController {
  async getTemplates() {
    let allTemplates = await mail_template.query().select('*')
    return allTemplates
  }

  async sendTemplate({ request, response }: HttpContext) {
    const {
      template,
      subject,
      contact,
      project,
      to_contact: toContact,
    } = request.only(['template', 'subject', 'contact', 'project', 'to_contact'])

    if (!contact.email) {
      return response.status(400).json({ message: 'Contact email is required' })
    }

    let contact_db = await Contact.find(contact.id)
    let template_db = await mail_template.find(template.id)
    let htmlFromDb = template_db?.content || ''
    let project_db = await project.find(project.id)
    let callsheet = await Callsheet.find(project_db.callsheet_id)
    let registration_id = project_db.registration_id

    if (htmlFromDb != '' && callsheet != null && registration_id != null) {
      if (contact_db?.subscribed == true) {
        const registrationNotificationMail = new TemplatePreparation(
          htmlFromDb,
          subject,
          contact,
          project,
          callsheet,
          toContact,
          registration_id
        )
        await mail.send(registrationNotificationMail)

        return response.json({ message: 'Email sent successfully' })
      } else {
        return response.json({ message: 'Contact is not subscribed' })
      }
    } else {
      return response.json({
        message:
          'Template not found or incomplete (callsheet not found or registration form not found)',
      })
    }
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
