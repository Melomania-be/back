import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

//nouvelle callsheet et admin demande envoie de mail => mail d'information de callsheets

export default class CallsheetNotification extends BaseMail {
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

  from: string
  subject: string

  constructor(
    contact: {
      id: number
      first_name: string
      last_name: string
      email: string
    },
    project: {
      id: number
      name: string
    },
    callsheet: {
      id: number
      version: string
      project_id: number
    },
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
    this.subject = 'Callsheet Updated'
    this.contact = contact
    this.project = project
    this.callsheet = callsheet
    this.toContact = toContact
  }

  prepare() {
    const url = env.get('URL') || ''
    const filename = fileURLToPath(import.meta.url)
    const dirname = path.dirname(filename)
    const htmlFilePath = path.join(dirname, 'html_templates/callsheet_notification.html')
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    const toContactDetails = this.toContact
      .map((contact) => {
        return `<br>${contact.first_name} ${contact.last_name}
              <br> Email: ${contact.email}
              <br> Phone: ${contact.phone}
              <br> Messenger: ${contact.messenger}`
      })
      .join('<br><br>')

    htmlContent = htmlContent
      .replace(/\${URL}/g, url)
      .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
      .replace(/\${PROJECT}/g, this.project.name)
      .replace(
        /\${CALLSHEET}/g,
        url + '/call_sheets/' + this.callsheet.id.toString() + '/' + this.contact.id.toString()
      )
      .replace(/\${TO_CONTACT}/g, toContactDetails)

    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject('Callsheet Updated')
      .html(htmlContent)
  }
}
