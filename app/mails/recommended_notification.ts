import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

//envoi d'un mail à un recommended pour lui proposer de s'inscrire à un projet

export default class RecommendedNotification extends BaseMail {
  recommended: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  registration: {
    id: number
    project_id: number
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

  from: string
  subject: string

  constructor(
    recommended: { id: number; first_name: string; last_name: string; email: string },
    registration: { id: number; project_id: number },
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
    this.subject = 'Registration to ' + project.name
    this.recommended = recommended
    this.registration = registration
    this.toContact = toContact
  }

  prepare() {
    const url = env.get('URL') || ''
    const filename = fileURLToPath(import.meta.url)
    const dirname = path.dirname(filename)
    const htmlFilePath = path.join(dirname, 'html_templates/recommendation_notification.html')
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')
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
      .replace(/\${NAME}/g, this.recommended.first_name + ' ' + this.recommended.last_name)
      .replace(/\${PROJECT}/g, this.project.name)
      .replace(/\${REGISTRATION}/g, url + '/registration/' + this.registration?.id?.toString())
      .replace(/\${TO_CONTACT}/g, toContactDetails)

    this.message
      .to(this.recommended.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('New Project')
      .html(htmlContent)
  }
}
