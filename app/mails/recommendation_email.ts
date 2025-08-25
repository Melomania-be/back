import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'

export default class RecommendationEmail extends BaseMail {
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

  recommenderName: string
  subject: string

  constructor(
    contact: { first_name: string; last_name: string; email: string },
    project: { id: number; name: string },
    recruiter: { name: string; email: string },
    recommenderName: string
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.project = project
    this.recruiter = recruiter
    this.recommenderName = recommenderName
    this.subject = `Vous avez été recommandé(e) pour le projet "${project.name}"`
  }

  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL')
    const nodeEnv = env.get('NODE_ENV', 'development')
    const host = env.get('HOST', 'localhost')

    if (envUrl && !envUrl.includes('localhost') && envUrl.trim() !== '') {
      return envUrl
    }

    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (nodeEnv === 'development' || host.includes('universe.wf')) {
        return 'http://tool.sc1ciro3903.universe.wf'
      }

      const isProduction = nodeEnv === 'production'
      if (isProduction || host.includes('melomania.be')) {
        return 'https://tool.melomania.be'
      }

      const protocol = isProduction ? 'https' : 'http'
      return `${protocol}://${host}`
    }

    return 'http://localhost:5173'
  }

  private replaceTemplateVariables(htmlContent: string, variables: Record<string, string>): string {
    let result = htmlContent

    Object.entries(variables).forEach(([key, value]) => {
      const safeValue = (value || '').replace(/\$/g, '$$')

      const patterns = [
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        new RegExp(`\\\\\\$\\{${key}\\}`, 'g'),
        new RegExp(`\\{${key}\\}`, 'g'),
      ]

      patterns.forEach((pattern) => {
        result = result.replace(pattern, safeValue)
      })
    })

    return result
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recommandation - \${PROJECT}</title>
    <style>
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 10px auto !important; padding: 15px !important; }
            .button { display: block !important; width: 100% !important; margin: 10px 0 !important; }
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
        }

        .header {
            background-color: #ffffff;
            color: #333;
            padding: 30px;
            text-align: center;
            border-bottom: 2px solid #ddd;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: normal;
            color: #333;
        }

        .content {
            padding: 30px;
        }

        .button {
            display: inline-block;
            padding: 12px 25px;
            background-color: #333;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            font-weight: normal;
            margin: 8px 4px;
            font-size: 14px;
        }

        .button:hover {
            background-color: #555;
        }

        .button.secondary {
            background-color: #666;
        }

        .button.secondary:hover {
            background-color: #777;
        }

        .footer {
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            background-color: #f9f9f9;
            border-top: 1px solid #ddd;
        }

        .recommendation-box {
            background-color: #f9f9f9;
            padding: 20px;
            border-left: 3px solid #333;
            margin: 20px 0;
        }

        .project-highlight {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            margin: 20px 0;
            text-align: center;
        }

        .signature {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 3px solid #333;
        }

        .signature p {
            margin: 5px 0;
        }

        .signature .name {
            font-weight: bold;
            color: #333;
        }

        .signature .email {
            color: #333;
            text-decoration: none;
        }

        .divider {
            height: 1px;
            background-color: #ddd;
            margin: 25px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invitation à rejoindre le projet musical</h1>
        </div>

        <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">Bonjour \${NAME},</p>

            <div class="recommendation-box">
                <p style="margin: 0; font-size: 15px;">
                    <strong>\${RECOMMENDER_NAME}</strong> nous a recommandé vos services pour notre projet musical.
                </p>
            </div>

            <p style="font-size: 15px; margin-bottom: 20px;">
                Suite à cette recommandation, nous avons le plaisir de vous inviter à rejoindre le projet :
            </p>

            <div class="project-highlight">
                <h2 style="color: #333; margin: 0; font-size: 22px; font-weight: bold;">
                    \${PROJECT}
                </h2>
            </div>

            <p style="margin-bottom: 25px; font-size: 15px;">
                Ce projet réunit des musiciens pour une collaboration artistique.
                La recommandation de <strong>\${RECOMMENDER_NAME}</strong> témoigne de vos compétences
                et nous pensons que votre participation serait un atout pour ce projet.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="\${REGISTRATION_URL}" class="button">
                    S'inscrire au projet
                </a>
                <a href="\${RECOMMEND_URL}" class="button secondary">
                    Recommander un musicien
                </a>
            </div>

            <div class="divider"></div>

            <p style="margin-bottom: 20px; font-size: 15px;">
                Nous serions ravis de compter sur votre participation.
            </p>

            <p style="margin-bottom: 30px;">
                Cordialement,
            </p>

            <div class="signature">
                <p class="name">\${RECRUITER_NAME}</p>
                <p>
                    <a href="mailto:\${RECRUITER_EMAIL}" class="email">
                        \${RECRUITER_EMAIL}
                    </a>
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0 0 10px 0;">
                Vous avez reçu cet email suite à la recommandation de <strong>\${RECOMMENDER_NAME}</strong>
                pour le projet "\${PROJECT}".
            </p>
            <p style="margin: 0;">
                <a href="\${UNSUBSCRIBE_URL}" style="color: #666; text-decoration: none;">
                    Se désinscrire
                </a>
            </p>
        </div>
    </div>
</body>
</html>`
  }

  async prepare() {
    try {
      const url = this.getFrontendUrl()

      let template = await MailTemplate.query()
        .where('name', 'recommendation_email.html')
        .first()

      if (!template) {
        template = await MailTemplate.query()
          .where('name', 'default_recommendation.html')
          .first()
      }

      let htmlContent = ''

      if (template) {
        htmlContent = template.content
      } else {
        htmlContent = this.getDefaultTemplate()
      }

      const templateVariables = {
        URL: url,
        NAME: `${this.contact.first_name} ${this.contact.last_name}`,
        PROJECT: this.project.name,
        RECRUITER_NAME: this.recruiter.name,
        RECRUITER_EMAIL: this.recruiter.email,
        RECOMMENDER_NAME: this.recommenderName,
        REGISTRATION_URL: `${url}/registration/${this.project.id}`,
        RECOMMEND_URL: `${url}/projects/${this.project.id}/recommend`,
        UNSUBSCRIBE_URL: `${url}/unsubscribe?email=${encodeURIComponent(this.contact.email)}&project=${this.project.id}`
      }

      htmlContent = this.replaceTemplateVariables(htmlContent, templateVariables)

      this.message
        .to(this.contact.email)
        .from(`${this.recruiter.name} <${env.get('SMTP_USERNAME')}>`)
        .replyTo(this.recruiter.email)
        .subject(this.subject)
        .html(htmlContent)

    } catch (error) {
      throw error
    }
  }
}
