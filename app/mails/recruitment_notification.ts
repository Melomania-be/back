import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'

//demande générale de participation au projet => mail de recrutement

export default class RecruitmentNotification extends BaseMail {
  contact: {
    first_name: string
    last_name: string
    email: string
  }

  registration: {
    id: number | undefined
    project_id: number | undefined
  }

  project: {
    name: string
  }

  toContact: Array<{
    first_name: string
    last_name: string
    email: string
    phone: string
    messenger: string
  }>

  constructor(
    contact: { first_name: string; last_name: string; email: string },
    registration: { id: number | undefined; project_id: number | undefined },
    project: { name: string },
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
    this.subject = project.name + 'recruitment notification'
    this.contact = contact
    this.registration = registration
    this.toContact = toContact
  }

  async prepare() {
    const url = env.get('URL') || ''
    const template = await MailTemplate.query()
      .where('name', 'recruitment_notification.html')
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
      .replace(/\${REGISTRATION}/g, url + '/registration/' + this.registration?.id?.toString())
      .replace(/\${TO_CONTACT}/g, toContactDetails)

    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('New Project by Melomania : ' + this.project.name)
      .html(htmlContent)
  }
}
