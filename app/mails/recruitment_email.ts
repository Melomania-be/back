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
  subject: string

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
    <title>Invitation - \${PROJECT}</title>
    <style>
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 10px auto !important; padding: 15px !important; }
            .button { display: block !important; width: 100% !important; margin: 10px 0 !important; }
            .grid { display: block !important; }
            .grid > div { margin-bottom: 15px !important; }
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }

        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .header {
            background: linear-gradient(135deg, #6B9AD9 0%, #5a9bb4 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }

        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }

        .content {
            padding: 30px;
        }

        .button {
            display: inline-block;
            padding: 15px 30px;
            background: #6B9AD9;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 10px 5px;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }

        .button:hover {
            background: #5a9bb4;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .button.primary {
            background: #28a745;
            font-size: 18px;
        }

        .button.primary:hover {
            background: #218838;
        }

        .button.secondary {
            background: #17a2b8;
        }

        .button.secondary:hover {
            background: #138496;
        }

        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            background-color: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }

        .recommendation {
            background: linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%);
            padding: 20px;
            border-left: 4px solid #6B9AD9;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }

        .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #ffeaa7;
            margin: 20px 0;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }

        .feature {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 3px solid #6B9AD9;
        }

        .feature h4 {
            margin: 0 0 10px 0;
            color: #6B9AD9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invitation Musicale</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Rejoignez notre projet musical</p>
        </div>

        <div class="content">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour \${NAME},</h2>

            \${RECOMMENDATION_TEXT}

            <p style="font-size: 16px; margin-bottom: 20px;">
                Nous avons le plaisir de vous inviter à rejoindre notre projet musical :
            </p>

            <div class="highlight">
                <h3 style="color: #6B9AD9; margin: 0; font-size: 24px; text-align: center;">
                    \${PROJECT}
                </h3>
            </div>

            <p style="margin-bottom: 25px;">
                Ce projet rassemble des musiciens passionnés pour créer une expérience musicale unique.
                Nous recherchons des talents comme vous pour enrichir notre ensemble.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="\${REGISTRATION_URL}" class="button primary">
                    S'inscrire au projet
                </a>
                <br>
                <a href="\${RECOMMEND_URL}" class="button secondary">
                    Recommander un musicien
                </a>
            </div>

            <div class="grid">
                <div class="feature">
                    <h4>Inscription facile</h4>
                    <p style="margin: 0; font-size: 14px;">Découvrez les détails du projet et inscrivez-vous selon votre instrument</p>
                </div>

                <div class="feature">
                    <h4>Communauté</h4>
                    <p style="margin: 0; font-size: 14px;">Rencontrez d'autres musiciens passionnés et créez ensemble</p>
                </div>

                <div class="feature">
                    <h4>Support</h4>
                    <p style="margin: 0; font-size: 14px;">Posez vos questions à notre équipe dédiée</p>
                </div>

                <div class="feature">
                    <h4>Recommandations</h4>
                    <p style="margin: 0; font-size: 14px;">Invitez d'autres musiciens à nous rejoindre</p>
                </div>
            </div>

            <p style="margin-top: 30px;">
                Au plaisir de faire de la musique ensemble,
            </p>

            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0; font-weight: bold;">\${RECRUITER_NAME}</p>
                <p style="margin: 5px 0 0 0;">
                    <a href="mailto:\${RECRUITER_EMAIL}" style="color: #6B9AD9; text-decoration: none;">
                        \${RECRUITER_EMAIL}
                    </a>
                </p>
            </div>
        </div>

        <div class="footer">
            <p style="margin: 0 0 10px 0;">
                Cet email vous a été envoyé dans le cadre du recrutement pour le projet "<strong>\${PROJECT}</strong>"
            </p>
            <p style="margin: 0;">
                <a href="\${UNSUBSCRIBE_URL}" style="color: #666; text-decoration: none;">
                    Se désinscrire des notifications
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
        .where('name', 'recruitment_email.html')
        .first()

      if (!template) {
        template = await MailTemplate.query()
          .where('name', 'default_recruitment.html')
          .first()
      }

      let htmlContent = ''

      if (template) {
        htmlContent = template.content
      } else {
        htmlContent = this.getDefaultTemplate()
      }

      let recommendationText = ''
      if (this.recommendedBy) {
        recommendationText = `
          <div class="recommendation">
              <h3 style="margin: 0 0 15px 0; color: #6B9AD9;">
                  Vous avez été recommandé(e) !
              </h3>
              <p style="margin: 0; font-size: 16px;">
                  <strong>${this.recommendedBy}</strong> pense que ce projet musical pourrait vous intéresser et nous a parlé de vos talents musicaux.
              </p>
          </div>
        `
      }

      const templateVariables = {
        URL: url,
        NAME: `${this.contact.first_name} ${this.contact.last_name}`,
        PROJECT: this.project.name,
        RECRUITER_NAME: this.recruiter.name,
        RECRUITER_EMAIL: this.recruiter.email,
        RECOMMENDATION_TEXT: recommendationText,
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
