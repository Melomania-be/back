import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Section from '#models/section'
import MailTemplate from '#models/mail_template'
import he from 'he'

export default class RefusalNotification extends BaseMail {
  from = env.get('SMTP_USERNAME') || 'benskotlemogo@gmail.com'
  subject = 'Candidature non retenue'

  constructor(
    private contact: Contact,
    private project: Project,
    private section: Section,
    private customMessage: string | null = null,
    private responsible: any = null
  ) {
    super()
  }

  async prepare() {
    const url = env.get('URL') || ''

    let htmlContent = ''

    // Utiliser toujours le template par défaut avec le message optionnel intégré
    let template = await MailTemplate.query().where('name', 'refusal_notification.html').first()

    if (template) {
      htmlContent = template.content
    } else {
      // Template par défaut identique à celui de la base de données SANS LOGO
      htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Candidature non retenue</title>
  <style>
    /* Styles pour la responsivité mobile */
    @media screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        margin: 10px auto !important;
        padding: 15px !important;
        border-radius: 5px !important;
      }
      .header-flex {
        flex-direction: column !important;
        gap: 15px !important;
      }
      .title {
        font-size: 28px !important;
      }
      .subtitle {
        font-size: 16px !important;
      }
      .content-padding {
        padding: 0 5px !important;
      }
    }

    @media screen and (max-width: 480px) {
      .container {
        margin: 5px auto !important;
        padding: 10px !important;
      }
      .title {
        font-size: 24px !important;
      }
      .subtitle {
        font-size: 14px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div class="container" style="max-width: 600px; width: 100%; margin: 20px auto; background-color: #ffffff; border-radius: 10px; padding: 20px; color: #333333; box-shadow: 0 0 10px rgba(0,0,0,0.05); box-sizing: border-box;">

    <div class="header-flex" style="text-align: center; margin-bottom: 30px;">
      <h1 class="title" style="margin: 0; font-size: 40px; color: #333; line-height: 1.2;">🎵 Melomania</h1>
      <p class="subtitle" style="font-size: 18px; margin-top: 8px; color: #666; line-height: 1.3;">La plateforme collaborative des musiciens</p>
    </div>

    <div class="content-padding" style="padding: 0 10px;">
      <p style="margin-bottom: 15px; line-height: 1.5;">Bonjour <strong>\${PARTICIPANT_FIRSTNAME} \${PARTICIPANT_LASTNAME}</strong>,</p>

      <p style="margin-bottom: 15px; line-height: 1.5;">Merci pour l'intérêt que vous portez au projet <strong>\${PROJECT_NAME}</strong>.</p>

      <p style="margin-bottom: 20px; line-height: 1.5;">Après avoir bien lu votre profil, nous avons le regret de vous annoncer que votre candidature n'a pas été retenue.</p>

      \${CUSTOM_MESSAGE_BLOCK}

      <p style="margin-bottom: 20px; line-height: 1.5;">Nous vous encourageons à postuler pour nos prochains projets. Votre profil pourrait parfaitement convenir à d'autres opportunités.</p>

      <p style="margin-top: 30px; margin-bottom: 15px; line-height: 1.5;">Merci encore pour votre candidature.</p>

      <p style="margin-bottom: 20px; line-height: 1.5;">Cordialement,<br />
      <strong>L'équipe du projet \${PROJECT_NAME}</strong></p>
    </div>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;" />
    <div class="content-padding" style="padding: 0 10px;">
      <p style="font-size: 12px; color: #888; line-height: 1.4; margin-bottom: 10px;">Cet email a été envoyé automatiquement. Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      \${CONTACT_EMAIL_BLOCK}
    </div>
  </div>
</body>
</html>`
    }

    // --- DÉBUT CORRECTION DE SÉCURITÉ (ANTI-PHISHING/XSS) ---

    const customMessageBlock = this.customMessage && this.customMessage.trim() !== ''
      ? `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
          ${he.encode(this.customMessage)}
         </div>`
      : ''
    // --- FIN CORRECTION ---

    // Préparer le bloc de contact
    const contactEmailBlock = this.responsible?.email
      ? `<p>Contact : <a href="mailto:${this.responsible.email}">${this.responsible.email}</a></p>`
      : ''

    // Remplacer toutes les variables dans le template
    htmlContent = htmlContent
      .replace(/\$\{URL\}/g, url)
      .replace(/\$\{PARTICIPANT_FIRSTNAME\}/g, this.contact.first_name || '')
      .replace(/\$\{PARTICIPANT_LASTNAME\}/g, this.contact.last_name || '')
      .replace(/\$\{PARTICIPANT_SECTION\}/g, this.section.name || '')
      .replace(/\$\{PROJECT_NAME\}/g, this.project.name || '')
      .replace(/\$\{CUSTOM_MESSAGE_BLOCK\}/g, customMessageBlock)
      .replace(/\$\{CONTACT_EMAIL_BLOCK\}/g, contactEmailBlock)

    this.message
      .to(this.contact.email)
      .from(this.from)
      .subject(this.subject)
      .html(htmlContent)
    
  }
}
