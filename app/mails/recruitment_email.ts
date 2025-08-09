// app/mails/recruitment_email.ts - Email de recrutement
import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'

export default class RecruitmentEmail extends BaseMail {
  contact: {
    first_name: string
    last_name: string
    email: string
  }

  project: {
    id: number
    name: string
  }

  recruiter: {
    name: string
    email: string
  }

  recommendedBy?: string

  constructor(
    contact: { first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    recruiter: { name: string; email: string },
    recommendedBy?: string
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.project = project
    this.recruiter = recruiter
    this.recommendedBy = recommendedBy
    this.subject = `Invitation à rejoindre le projet "${project.name}"`
  }

  async prepare() {
    const url = env.get('URL') || 'http://localhost:3333'

    // Essayer de récupérer un template personnalisé
    let template = await MailTemplate.query()
      .where('name', 'recruitment_email.html')
      .first()

    // Si pas de template personnalisé, utiliser le template par défaut
    if (!template) {
      template = await MailTemplate.query()
        .where('name', 'default_recruitment.html')
        .first()
    }

    let htmlContent = ''

    if (template) {
      htmlContent = template.content
    } else {
      // Template par défaut intégré
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invitation - \${PROJECT}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #6B9AD9; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; background: #6B9AD9; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
                .button:hover { background: #5a9bb4; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                .recommendation { background: #e8f4fd; padding: 15px; border-left: 4px solid #6B9AD9; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Invitation Musicale</h1>
                </div>
                <div class="content">
                    <h2>Bonjour \${NAME},</h2>

                    \${RECOMMENDATION_TEXT}

                    <p>Nous avons le plaisir de vous inviter à rejoindre notre projet musical :</p>
                    <h3 style="color: #6B9AD9;">\${PROJECT}</h3>

                    <p>Ce projet rassemble des musiciens passionnés pour créer une expérience musicale unique.</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="\${REGISTRATION_URL}" class="button">📝 S'inscrire au projet</a>
                        <a href="\${RECOMMEND_URL}" class="button">👥 Recommander un musicien</a>
                    </div>

                    <p>En cliquant sur "S'inscrire", vous pourrez :</p>
                    <ul>
                        <li>Découvrir les détails du projet</li>
                        <li>Vous inscrire selon votre instrument</li>
                        <li>Poser vos questions à l'équipe</li>
                    </ul>

                    <p>Vous connaissez d'autres musiciens qui pourraient être intéressés ? N'hésitez pas à les recommander !</p>

                    <p>Au plaisir de faire de la musique ensemble,</p>
                    <p><strong>\${RECRUITER_NAME}</strong><br>
                    <a href="mailto:\${RECRUITER_EMAIL}">\${RECRUITER_EMAIL}</a></p>
                </div>
                <div class="footer">
                    <p>Cet email vous a été envoyé dans le cadre du recrutement pour le projet "\${PROJECT}"</p>
                    <p>Si vous ne souhaitez plus recevoir ces emails, <a href="\${UNSUBSCRIBE_URL}">cliquez ici</a></p>
                </div>
            </div>
        </body>
        </html>
      `
    }

    // Texte de recommandation si applicable
    let recommendationText = ''
    if (this.recommendedBy) {
      recommendationText = `
        <div class="recommendation">
            <p><strong>💡 Vous avez été recommandé(e) par ${this.recommendedBy}</strong></p>
            <p>Cette personne pense que ce projet musical pourrait vous intéresser !</p>
        </div>
      `
    }

    // Remplacement des variables
    htmlContent = htmlContent
      .replace(/\${URL}/g, url)
      .replace(/\${NAME}/g, `${this.contact.first_name} ${this.contact.last_name}`)
      .replace(/\${PROJECT}/g, this.project.name)
      .replace(/\${RECRUITER_NAME}/g, this.recruiter.name)
      .replace(/\${RECRUITER_EMAIL}/g, this.recruiter.email)
      .replace(/\${RECOMMENDATION_TEXT}/g, recommendationText)
      .replace(/\${REGISTRATION_URL}/g, `${url}/registration/${this.project.id}`)
      .replace(/\${RECOMMEND_URL}/g, `${url}/projects/${this.project.id}/recommend`)
      .replace(/\${UNSUBSCRIBE_URL}/g, `${url}/unsubscribe?email=${encodeURIComponent(this.contact.email)}`)

    this.message
      .to(this.contact.email)
      .from(`${this.recruiter.name} <${env.get('SMTP_USERNAME')}>`)
      .replyTo(this.recruiter.email)
      .subject(this.subject)
      .html(htmlContent)
  }
}
