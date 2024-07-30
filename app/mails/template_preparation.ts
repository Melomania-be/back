import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import Callsheet from '#models/callsheet'

export default class TemplatePreparation extends BaseMail {
  contact: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  project:
    | {
        id: number
        name: string
      }
    | null
    | undefined
  toContact: {
    firstName: string
    lastName: string
    email: string
    phone: string
    messenger: string
  }
  registration:
    | {
        id: number
        project_id: number
      }
    | null
    | undefined
  from: string
  htmlFromDb: string
  callsheet: Callsheet | null | undefined

  constructor(
    htmlFromDb: string,
    contact: { id: number; first_name: string; last_name: string; email: string },
    project: { id: number; name: string } | null | undefined,
    callsheet: Callsheet | null,
    to_contact: {
      firstName: string
      lastName: string
      email: string
      phone: string
      messenger: string
    },
    registration: { id: number; project_id: number } | null | undefined
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.project = project
    this.callsheet = callsheet
    this.toContact = to_contact
    this.registration = registration
    this.htmlFromDb = htmlFromDb
  }

  prepare() {
    const url = env.get('URL') || ''

    let htmlContent = this.htmlFromDb
      .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
      .replace(/\${URL}/g, url)
      .replace(/\${PROJECT}/g, this.project?.name ?? '')
      .replace(
        /\${CALLSHEET}/g,
        this.callsheet ? `${URL}/call_sheets/${this.callsheet.id}/${this.contact.id}` : ''
      )
      .replace(
        /\${TO_CONTACT}/g,
        '<br>' +
          this.toContact.firstName +
          ' ' +
          this.toContact.lastName +
          '<br> mail : ' +
          this.toContact.email +
          '<br> phone : ' +
          this.toContact.phone +
          '<br> messenger :  ' +
          this.toContact.messenger
      )
    if (this.registration) {
      htmlContent = htmlContent.replace(
        /\${REGISTRATION}/g,
        `${URL}/registration/${this.registration.id}`
      )
    } else {
      htmlContent = htmlContent.replace(/\${REGISTRATION}/g, `${URL}/registration/default_value`)
    }
    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('Notification')
      .html(htmlContent)
  }
}
