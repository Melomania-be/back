import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import Callsheet from '#models/callsheet'

//pour toute template de mail

export default class TemplatePreparation extends BaseMail {
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
  to_contact: {
    first_name: string
    last_name: string
    email: string
    phone: string
    messenger: string
  }
  registration: {
    id: number
    project_id: number
  }
  from: string
  htmlFromDb: string
  callsheet: Callsheet

  constructor(
    htmlFromDb: string,
    contact: { id: number; first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    callsheet: Callsheet,
    to_contact: {
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    },
    registration: { id: number; project_id: number }
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.project = project
    this.callsheet = callsheet
    this.to_contact = to_contact
    this.registration = registration
    this.htmlFromDb = htmlFromDb
  }

  prepare() {
    let htmlContent =
      this.htmlFromDb
        .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
        .replace(/\${PROJECT}/g, this.project.name)
        .replace(
          /\${CALLSHEET}/g,
          'http://tool.ciro3903.odns.fr/call_sheets/' +
            this.callsheet.id.toString() +
            '/' +
            this.contact.id.toString()
        )
        .replace(
          /\${TO_CONTACT}/g,
          '<br>' +
            this.to_contact.first_name +
            ' ' +
            this.to_contact.last_name +
            '<br> mail : ' +
            this.to_contact.email +
            '<br> phone : ' +
            this.to_contact.phone
        ) +
      '<br> messenger : ' +
      this.to_contact.messenger.replace(
        /\${REGISTRATION}/g,
        'http://tool.ciro3903.odns.fr/registration/' + this.registration.id.toString()
      )

    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('Notification')
      .html(htmlContent)
  }
}
