import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

export default class RegistrationNotification extends BaseMail {
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

  to_contact: {
    first_name: string
    last_name: string
    email: string
    phone: string
    messenger: string
  }

  constructor(
    contact: { id: number; first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    callsheet: { id: number; version: string; project_id: number },
    to_contact: {
      first_name: string
      last_name: string
      email: string
      phone: string
      messenger: string
    }
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.project = project
    this.subject = 'Validation on the project ' + project.name
    this.contact = contact
    this.callsheet = callsheet
    this.to_contact = to_contact
  }
  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const htmlFilePath = path.join(__dirname, 'html_templates/confirmation_notification.html')
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    htmlContent =
      htmlContent
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
      this.to_contact.messenger

    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('Project Validation')
      .html(htmlContent)
  }
}
