import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import { fileURLToPath } from 'url';
import fs from 'fs'
import path from 'path'

//nouvelle callsheet et admin demande envoie de mail => mail d'information de callsheets

export default class CallsheetNotification extends BaseMail {
    contact : {
      first_name: string;
      last_name: string;
      email: string;
    };
    project: {
      id: number;
      name: string;
    };
    callsheet: {
      id : number;
      version: string;
      project_id: number;
    }
    to_contact: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      messenger: string;
    }
    from: string;
    subject: string;

    constructor(contact: { first_name: string; last_name: string; email: string } , project: { id: number; name: string } , callsheet: { id: number; version: string; project_id: number } , to_contact: { first_name: string; last_name: string; email: string; phone: string; messenger: string }) {
      super()
      this.from = env.get('SMTP_USERNAME')
      this.subject = 'Callsheet Updated'
      this.contact = contact
      this.project = project
      this.callsheet = callsheet
      this.to_contact = to_contact
    }
  
  prepare() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const htmlFilePath = path.join(__dirname, 'html_templates/callsheet_notification.html')
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    htmlContent = htmlContent.replace('${contact.first_name}', this.contact.first_name)
    .replace('${contact.last_name}', this.contact.last_name)
    .replace('${project}', this.project.name)
    .replace('${callsheet}', this.callsheet.id.toString())
    .replace('${to_contact}', '<br>' + this.to_contact.first_name + ' ' + this.to_contact.last_name + '<br> mail : ' + this.to_contact.email + '<br> phone : ' + this.to_contact.phone) + '<br> messenger : ' + this.to_contact.messenger

    this.message
      .to(this.contact.email)
      .subject(this.subject)
      .html(htmlContent)
  }
}
