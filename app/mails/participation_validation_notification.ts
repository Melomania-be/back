import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'

export default class ParticipationValidationNotification extends BaseMail {
  contact: {
    id: number
    first_name: string
    last_name: string
    email: string
  }

  project: {
    id: number
    name: string
  }

  callsheet: {
    id: number
    version: string
    project_id: number
  }

  toContact: Array<{
    first_name: string
    last_name: string
    email: string
    phone: string
    messenger: string
  }>

  constructor(
    contact: { id: number; first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    callsheet: { id: number; version: string; project_id: number },
    toContact: Array<{
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    }>
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.project = project
    this.subject = 'Validation on the project ' + project.name
    this.contact = contact
    this.callsheet = callsheet
    this.toContact = toContact
  }

  async prepare() {
    const url = env.get('URL') || ''
    const template = await MailTemplate.query()
      .where('name', 'participation_validation_notification.html')
      .first()

    if (!template) {
      throw new Error('Template callsheet_notification.html not found')
    }

    let htmlContent = template.content
    let toContactDetails = ''

    if (this.toContact.length <= 0) {
      toContactDetails = `<br> No contact details available`
    } else {
      toContactDetails = this.toContact
        .map((contact) => {
          return `<br>${contact.first_name} ${contact.last_name}
              <br> Email: ${contact.email}
              <br> Phone: ${contact.phone}
              <br> Messenger: ${contact.messenger}`
        })
        .join('<br><br>')
    }

    htmlContent = htmlContent
      .replace(/\${URL}/g, url)
      .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
      .replace(/\${PROJECT}/g, this.project.name)
      .replace(
        /\${CALLSHEET}/g,
        url + '/call_sheets/' + this.callsheet.id.toString() + '/' + this.contact.id.toString()
      )
      .replace(/\${TO_CONTACT}/g, '<br>' + toContactDetails)

    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('Your participation to ' + this.project.name)
      .html(htmlContent)
  }
}
