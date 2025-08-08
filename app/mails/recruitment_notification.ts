// app/mails/recruitment_notification.ts
import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'

export default class RecruitmentNotification extends BaseMail {
  contact: {
    first_name: string
    last_name: string
    email: string
  }

  project: {
    id: number
    name: string
  }

  recruitmentContact: {
    id: number
  }

  recommenderName?: string

  constructor(
    contact: { first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    recruitmentContact: { id: number },
    recommenderName?: string
  ) {
    super()
    this.contact = contact
    this.project = project
    this.recruitmentContact = recruitmentContact
    this.recommenderName = recommenderName
  }

  async prepare() {
    const url = env.get('URL') || ''

    // Utiliser un template spécifique ou un template par défaut
    const templateName = this.recommenderName
      ? 'recruitment_recommendation_notification.html'
      : 'recruitment_notification.html'

    const template = await MailTemplate.query()
      .where('name', templateName)
      .first()

    if (!template) {
      throw new Error(`Template ${templateName} not found`)
    }

    let htmlContent = template.content
      .replace(/\${NAME}/g, `${this.contact.first_name} ${this.contact.last_name}`)
      .replace(/\${PROJECT}/g, this.project.name)
      .replace(/\${URL}/g, url)
      .replace(/\${REGISTRATION_URL}/g, `${url}/registration/${this.project.id}`)
      .replace(/\${RECOMMENDATION_URL}/g, `${url}/projects/${this.project.id}/recommend`)

    if (this.recommenderName) {
      htmlContent = htmlContent.replace(/\${RECOMMENDER_NAME}/g, this.recommenderName)
    }

    const subject = this.recommenderName
      ? `${this.recommenderName} vous recommande pour le projet ${this.project.name}`
      : `Invitation à participer au projet ${this.project.name}`

    this.message
      .to(this.contact.email)
      .from(`Melomania <${env.get('SMTP_USERNAME')}>`)
      .subject(subject)
      .html(htmlContent)
  }
}
