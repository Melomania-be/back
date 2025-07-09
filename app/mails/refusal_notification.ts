import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Section from '#models/section'
import MailTemplate from '#models/mail_template'

export default class RefusalNotification extends BaseMail {
  from = env.get('SMTP_USERNAME')
  subject = 'Candidature non retenue'

  // URL du logo hébergé
  private logoUrl = 'https://static.wixstatic.com/media/90f349_9af8027280c347c29fdab0e895368255~mv2.png/v1/crop/x_20,y_0,w_351,h_638/fill/w_82,h_149,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/melomania_favicon_392x638.png'

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
    let template = await MailTemplate.query().where('name', 'refusal_notification.html').first()

    if (template) {
      htmlContent = template.content
    } else {
      // Template optimisé pour TOUS les clients email avec logo URL
      htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Candidature non retenue</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset CSS pour email */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f9f9f9 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
    }

    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }

    td {
      border-collapse: collapse !important;
    }

    img {
      border: 0 !important;
      outline: none !important;
      text-decoration: none !important;
      -ms-interpolation-mode: bicubic !important;
    }

    /* Styles pour mobile - Compatible avec tous les clients */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        margin: 10px auto !important;
      }

      .header-table {
        width: 100% !important;
      }

      .logo-cell {
        text-align: center !important;
        padding-bottom: 20px !important;
      }

      .title-cell {
        text-align: center !important;
      }

      .title {
        font-size: 28px !important;
        line-height: 32px !important;
      }

      .subtitle {
        font-size: 16px !important;
        line-height: 20px !important;
      }

      .content-cell {
        padding: 15px !important;
      }

      .logo-img {
        max-width: 100px !important;
        height: auto !important;
      }
    }

    /* Styles spécifiques pour Outlook */
    @media screen and (max-width: 480px) {
      .title {
        font-size: 24px !important;
        line-height: 28px !important;
      }

      .subtitle {
        font-size: 14px !important;
        line-height: 18px !important;
      }

      .logo-img {
        max-width: 80px !important;
      }
    }

    /* Styles pour mode sombre */
    @media (prefers-color-scheme: dark) {
      .container {
        background-color: #1a1a1a !important;
        color: #ffffff !important;
      }

      .content-text {
        color: #ffffff !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: Arial, Helvetica, sans-serif;">
  <!--[if mso]>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td>
  <![endif]-->

  <!-- Container principal -->
  <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0"
         style="max-width: 600px; width: 100%; margin: 20px auto; background-color: #ffffff;
                border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">

    <!-- En-tête avec logo et titre -->
    <tr>
      <td style="padding: 30px 20px;">
        <table class="header-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <!-- Logo -->
            <td class="logo-cell" style="width: 150px; text-align: center; vertical-align: middle; padding-right: 20px;">
              \${LOGO_BLOCK}
            </td>

            <!-- Titre -->
            <td class="title-cell" style="text-align: center; vertical-align: middle;">
              <h1 class="title" style="margin: 0; font-size: 40px; color: #333333; line-height: 44px; font-weight: bold;">
                Melomania
              </h1>
              <p class="subtitle" style="font-size: 18px; margin: 8px 0 0 0; color: #666666; line-height: 22px;">
                La plateforme collaborative des musiciens
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Contenu principal -->
    <tr>
      <td class="content-cell" style="padding: 20px 30px;">
        <p class="content-text" style="margin: 0 0 15px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Bonjour <strong>\${PARTICIPANT_FIRSTNAME} \${PARTICIPANT_LASTNAME}</strong>,
        </p>

        <p class="content-text" style="margin: 0 0 15px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Merci pour l'intérêt que vous portez au projet <strong>\${PROJECT_NAME}</strong>.
        </p>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Après avoir bien lu votre profil, nous avons le regret de vous annoncer que votre candidature n'a pas été retenue.
        </p>

        <!-- Message personnalisé -->
        \${CUSTOM_MESSAGE_BLOCK}

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Nous vous encourageons à postuler pour nos prochains projets. Votre profil pourrait parfaitement convenir à d'autres opportunités.
        </p>

        <p class="content-text" style="margin: 30px 0 15px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Merci encore pour votre candidature.
        </p>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Cordialement,<br>
          <strong>L'équipe du projet \${PROJECT_NAME}</strong>
        </p>
      </td>
    </tr>

    <!-- Pied de page -->
    <tr>
      <td style="padding: 0 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="border-top: 1px solid #dddddd; padding: 20px 0;">
              <p style="font-size: 12px; color: #888888; line-height: 16px; margin: 0 0 10px 0;">
                Cet email a été envoyé automatiquement. Si vous avez des questions, n'hésitez pas à nous contacter.
              </p>
              \${CONTACT_EMAIL_BLOCK}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!--[if mso]>
      </td>
    </tr>
  </table>
  <![endif]-->
</body>
</html>`
    }

    // Préparer le bloc de message personnalisé
    const customMessageBlock = this.customMessage && this.customMessage.trim() !== ''
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff;">
              <p style="margin: 0; line-height: 24px; color: #333333; font-size: 16px;">
                ${this.customMessage}
              </p>
            </td>
          </tr>
        </table>`
      : ''

    // Préparer le bloc de contact
    const contactEmailBlock = this.responsible?.email
      ? `<p style="font-size: 12px; color: #888888; line-height: 16px; margin: 0;">
          Contact : <a href="mailto:${this.responsible.email}" style="color: #007bff; text-decoration: none;">
            ${this.responsible.email}
          </a>
        </p>`
      : ''

    // Logo depuis l'URL - beaucoup plus simple !
    const logoBlock = `<img src="${this.logoUrl}" alt="Logo Melomania" class="logo-img"
         style="max-width: 125px; width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 6px;">`

    // Remplacer toutes les variables dans le template
    htmlContent = htmlContent
      .replace(/\$\{URL\}/g, url)
      .replace(/\$\{PARTICIPANT_FIRSTNAME\}/g, this.contact.first_name || '')
      .replace(/\$\{PARTICIPANT_LASTNAME\}/g, this.contact.last_name || '')
      .replace(/\$\{PARTICIPANT_SECTION\}/g, this.section.name || '')
      .replace(/\$\{PROJECT_NAME\}/g, this.project.name || '')
      .replace(/\$\{CUSTOM_MESSAGE_BLOCK\}/g, customMessageBlock)
      .replace(/\$\{CONTACT_EMAIL_BLOCK\}/g, contactEmailBlock)
      .replace(/\$\{LOGO_BLOCK\}/g, logoBlock)

    // Configuration du message - beaucoup plus simple !
    this.message
      .to(this.contact.email)
      .from(this.from, 'Melomania')  // Nom d'affichage personnalisé
      .subject(this.subject)
      .html(htmlContent)
      .text(this.generateTextVersion())

    console.log(`✅ Email de refus préparé pour ${this.contact.email} avec logo depuis URL`)
  }

  // Générer une version texte de l'email
  private generateTextVersion(): string {
    const customMessageText = this.customMessage ? `\n\n${this.customMessage}\n` : ''
    const contactText = this.responsible?.email ? `\n\nContact : ${this.responsible.email}` : ''

    return `
Melomania - La plateforme collaborative des musiciens

Bonjour ${this.contact.first_name || ''} ${this.contact.last_name || ''},

Merci pour l'intérêt que vous portez au projet ${this.project.name || ''}.

Après avoir bien lu votre profil, nous avons le regret de vous annoncer que votre candidature n'a pas été retenue.
${customMessageText}
Nous vous encourageons à postuler pour nos prochains projets. Votre profil pourrait parfaitement convenir à d'autres opportunités.

Merci encore pour votre candidature.

Cordialement,
L'équipe du projet ${this.project.name || ''}
${contactText}

---
Cet email a été envoyé automatiquement. Si vous avez des questions, n'hésitez pas à nous contacter.
    `.trim()
  }
}
