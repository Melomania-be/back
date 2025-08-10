// app/mails/recruitment_email.ts - Version complète corrigée avec détection d'URL
import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import MailTemplate from '#models/mail_template'
import type Project from '#models/project'
import type Contact from '#models/contact'

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

  /**
   * ✅ FONCTION DE DÉTECTION D'URL : Identique à celle des callsheets pour la cohérence
   */
  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL')
    const nodeEnv = env.get('NODE_ENV', 'development')
    const host = env.get('HOST', 'localhost')
    const port = env.get('PORT', '3333')

    console.log('🔍 Environment detection for recruitment email:', {
      FRONTEND_URL: envUrl,
      NODE_ENV: nodeEnv,
      HOST: host,
      PORT: port,
    })

    // Si FRONTEND_URL est définie explicitement et n'est pas localhost, l'utiliser
    if (envUrl && !envUrl.includes('localhost')) {
      console.log(`🌐 Using explicit FRONTEND_URL: ${envUrl}`)
      return envUrl
    }

    // Détection automatique basée sur HOST et NODE_ENV
    if (host !== 'localhost' && host !== '127.0.0.1') {
      // On est sur un serveur distant
      if (nodeEnv === 'development' || host.includes('universe.wf')) {
        const frontendUrl = 'http://tool.sc1ciro3903.universe.wf'
        console.log(`🧪 Auto-detected TEST environment: ${frontendUrl}`)
        return frontendUrl
      }

      if (nodeEnv === 'production' || host.includes('melomania.be')) {
        const frontendUrl = 'https://tool.melomania.be'
        console.log(`🚀 Auto-detected PRODUCTION environment: ${frontendUrl}`)
        return frontendUrl
      }

      // Fallback pour serveur distant non reconnu
      const isProduction = (nodeEnv as string) === 'production'
      const protocol = isProduction ? 'https' : 'http'
      const frontendUrl = `${protocol}://${host}`
      console.log(`⚡ Auto-detected REMOTE server: ${frontendUrl}`)
      return frontendUrl
    }

    // Développement local
    const frontendUrl = envUrl || 'http://localhost:5173'
    console.log(`🔧 Using LOCAL development: ${frontendUrl}`)
    return frontendUrl
  }

  /**
   * ✅ MÉTHODE DE REMPLACEMENT SÉCURISÉ : Variables de template
   */
  private replaceTemplateVariables(htmlContent: string, variables: Record<string, string>): string {
    let result = htmlContent

    Object.entries(variables).forEach(([key, value]) => {
      // Échapper la valeur pour éviter les problèmes avec les caractères spéciaux
      const safeValue = (value || '').replace(/\$/g, '$$')

      // Patterns de remplacement pour différents formats
      const patterns = [
        new RegExp(`\\$\\{${key}\\}`, 'g'),      // ${KEY}
        new RegExp(`\\\\\\$\\{${key}\\}`, 'g'),  // \${KEY}
        new RegExp(`\\{${key}\\}`, 'g'),         // {KEY}
      ]

      patterns.forEach((pattern) => {
        result = result.replace(pattern, safeValue)
      })
    })

    return result
  }

  /**
   * ✅ TEMPLATE PAR DÉFAUT : Email de recrutement moderne et responsive
   */
  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation - \${PROJECT}</title>
    <style>
        /* Styles responsive */
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

        .emoji {
            font-size: 20px;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="emoji">🎵</span> Invitation Musicale</h1>
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
                    <span class="emoji">🎼</span> \${PROJECT}
                </h3>
            </div>

            <p style="margin-bottom: 25px;">
                Ce projet rassemble des musiciens passionnés pour créer une expérience musicale unique.
                Nous recherchons des talents comme vous pour enrichir notre ensemble.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="\${REGISTRATION_URL}" class="button primary">
                    <span class="emoji">📝</span> S'inscrire au projet
                </a>
                <br>
                <a href="\${RECOMMEND_URL}" class="button secondary">
                    <span class="emoji">👥</span> Recommander un musicien
                </a>
            </div>

            <div class="grid">
                <div class="feature">
                    <h4><span class="emoji">🎯</span> Inscription facile</h4>
                    <p style="margin: 0; font-size: 14px;">Découvrez les détails du projet et inscrivez-vous selon votre instrument</p>
                </div>

                <div class="feature">
                    <h4><span class="emoji">🤝</span> Communauté</h4>
                    <p style="margin: 0; font-size: 14px;">Rencontrez d'autres musiciens passionnés et créez ensemble</p>
                </div>

                <div class="feature">
                    <h4><span class="emoji">💬</span> Support</h4>
                    <p style="margin: 0; font-size: 14px;">Posez vos questions à notre équipe dédiée</p>
                </div>

                <div class="feature">
                    <h4><span class="emoji">🌟</span> Recommandations</h4>
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
                        <span class="emoji">📧</span> \${RECRUITER_EMAIL}
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
      // ✅ CORRECTION : Utiliser la même logique que les callsheets
      const url = this.getFrontendUrl()

      console.log('📧 Preparing recruitment email for:', this.contact.email)
      console.log('📧 Frontend URL detected:', url)
      console.log('📧 Project:', this.project.name)
      console.log('📧 Recruiter:', this.recruiter.name)

      // Essayer de récupérer un template personnalisé
      let template = await MailTemplate.query()
        .where('name', 'recruitment_email.html')
        .first()

      // Si pas de template personnalisé, essayer le template par défaut
      if (!template) {
        template = await MailTemplate.query()
          .where('name', 'default_recruitment.html')
          .first()
      }

      let htmlContent = ''

      if (template) {
        console.log('📧 Using database template:', template.name)
        htmlContent = template.content
      } else {
        console.log('📧 Using built-in default template')
        htmlContent = this.getDefaultTemplate()
      }

      // ✅ TEXTE DE RECOMMANDATION : Si la personne a été recommandée
      let recommendationText = ''
      if (this.recommendedBy) {
        recommendationText = `
          <div class="recommendation">
              <h3 style="margin: 0 0 15px 0; color: #6B9AD9;">
                  <span class="emoji">💡</span> Vous avez été recommandé(e) !
              </h3>
              <p style="margin: 0; font-size: 16px;">
                  <strong>${this.recommendedBy}</strong> pense que ce projet musical pourrait vous intéresser et nous a parlé de vos talents musicaux.
              </p>
          </div>
        `
      }

      // ✅ VARIABLES DE REMPLACEMENT : Toutes les URLs et données
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

      console.log('🔧 Template variables prepared:')
      console.log('  - Registration URL:', templateVariables.REGISTRATION_URL)
      console.log('  - Recommend URL:', templateVariables.RECOMMEND_URL)
      console.log('  - Has recommendation:', !!this.recommendedBy)

      // ✅ REMPLACEMENT DES VARIABLES
      htmlContent = this.replaceTemplateVariables(htmlContent, templateVariables)

      console.log('📧 Email content prepared successfully')

      // ✅ CONFIGURATION DE L'EMAIL
      this.message
        .to(this.contact.email)
        .from(`${this.recruiter.name} <${env.get('SMTP_USERNAME')}>`)
        .replyTo(this.recruiter.email)
        .subject(this.subject)
        .html(htmlContent)

      console.log('✅ Email configured and ready to send')

    } catch (error) {
      console.error('❌ Error preparing recruitment email:', error)
      throw error
    }
  }
}
