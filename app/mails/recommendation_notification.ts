import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

//demande de participation au projet => mail registration

export default class RecommendationNotification extends BaseMail {

  contact : {
    first_name: string;
    last_name: string;
    email: string;
  };
  
  registration : {
    id: number;
    project_id: number;
  };

  project : {
    name: string;
  };
  
  constructor(contact : {first_name : string, last_name : string, email : string}, registration : {id : number, project_id : number}, project : {name : string})
    {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.project = project
    this.subject = 'Registration to ' + project.name
    this.contact = contact
    this.registration = registration
  }

  prepare() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const htmlFilePath = path.join(__dirname, 'html_templates/recommendation_notification.html')
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf-8')

    htmlContent = htmlContent
    .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
    .replace(/\${PROJECT}/g, this.project.name)
    .replace(/\${REGISTRATION}/g, 'http://tool.ciro3903.odns.fr/registration/' + this.registration.id.toString())

    this.message
    .to(this.contact.email)
    .from(env.get('SMTP_USERNAME'))
    .subject('New Project')
    .html(htmlContent)
  }
}