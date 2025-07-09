import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Section from '#models/section'
import type Audition from '#models/audition'
import MailTemplate from '#models/mail_template'

export default class AuditionRequest extends BaseMail {
  override from: string
  override subject = 'Audition Request - Musical Project'

  // URL du logo hébergé
  private logoUrl = 'https://static.wixstatic.com/media/90f349_9af8027280c347c29fdab0e895368255~mv2.png/v1/crop/x_20,y_0,w_351,h_638/fill/w_82,h_149,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/melomania_favicon_392x638.png'

  constructor(
    private contact: Contact,
    private project: Project,
    private _section: Section,
    private audition: Audition,
    private responsible: any = null
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
  }

  /**
   * Détermine l'URL frontend correcte selon l'environnement de déploiement
   */
  private getFrontendUrl(): string {
    const envUrl = env.get('FRONTEND_URL')
    const nodeEnv = env.get('NODE_ENV', 'development')
    const host = env.get('HOST', 'localhost')
    const port = env.get('PORT', '3333')

    console.log('🔍 Environment detection:', {
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
   * Remplacement sécurisé des variables de template
   */
  private replaceTemplateVariables(htmlContent: string, variables: Record<string, string>): string {
    let result = htmlContent

    // Pour chaque variable, remplacer toutes les variations possibles
    Object.entries(variables).forEach(([key, value]) => {
      // Échapper la valeur pour éviter les problèmes avec les caractères spéciaux
      const safeValue = (value || '').replace(/\$/g, '$$') // Escape $ for replacement

      // Patterns pour accolades simples {KEY}
      const patterns = [
        new RegExp(`\\{${key}\\}`, 'g'), // {KEY} - pattern principal
        new RegExp(`\\\\\\$\\{${key}\\}`, 'g'), // \${KEY} - fallback
        new RegExp(`\\$\\{${key}\\}`, 'g'), // ${KEY} - fallback
      ]

      let replacementCount = 0
      patterns.forEach((pattern) => {
        const matches = result.match(pattern)
        if (matches) {
          replacementCount += matches.length
          result = result.replace(pattern, safeValue)
        }
      })

      console.log(`🔧 Replaced ${key}: ${replacementCount} occurrences found and replaced`)
      if (replacementCount === 0) {
        console.warn(`⚠️  Variable ${key} not found in template`)
      }
    })

    return result
  }

  /**
   * Template HTML professionnel et épuré
   */
  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Audition Request</title>
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
      background-color: #f8f9fa !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
      line-height: 1.6 !important;
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

    /* Styles pour mobile */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        margin: 10px auto !important;
        padding: 15px !important;
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

      .access-button {
        width: 100% !important;
        padding: 15px !important;
        font-size: 16px !important;
      }
    }

    @media screen and (max-width: 480px) {
      .container {
        margin: 5px auto !important;
        padding: 10px !important;
      }

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
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <!--[if mso]>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td>
  <![endif]-->

  <!-- Container principal -->
  <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0"
         style="max-width: 600px; width: 100%; margin: 20px auto; background-color: #ffffff;
                border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

    <!-- En-tête avec logo et titre -->
    <tr>
      <td style="padding: 40px 30px 30px 30px;">
        <table class="header-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <!-- Logo -->
            <td class="logo-cell" style="width: 120px; text-align: center; vertical-align: middle; padding-right: 20px;">
              {LOGO_BLOCK}
            </td>

            <!-- Titre -->
            <td class="title-cell" style="text-align: left; vertical-align: middle;">
              <h1 class="title" style="margin: 0; font-size: 32px; color: #2c3e50; line-height: 38px; font-weight: 600;">
                Melomania
              </h1>
              <p class="subtitle" style="font-size: 16px; margin: 5px 0 0 0; color: #7f8c8d; line-height: 20px; font-weight: 400;">
                Professional Musicians Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Ligne de séparation -->
    <tr>
      <td style="padding: 0 30px;">
        <div style="height: 1px; background-color: #e9ecef; margin: 0;"></div>
      </td>
    </tr>

    <!-- Contenu principal -->
    <tr>
      <td class="content-cell" style="padding: 30px;">

        <!-- Titre principal -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 600;">Audition Request</h2>
              <p style="color: #6c757d; margin: 8px 0 0 0; font-size: 16px;">Musical Project Assessment</p>
            </td>
          </tr>
        </table>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 26px; color: #495057; font-size: 16px;">
          Dear <strong>{NAME}</strong>,
        </p>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 26px; color: #495057; font-size: 16px;">
          Thank you for your application to the <strong>{PROJECT}</strong> project. We have reviewed your profile and would like to invite you to participate in an audition process.
        </p>

        <!-- Instructions d'audition -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #6c63ff;">
              <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">Audition Instructions</h3>
              <div style="margin: 0; color: #495057; line-height: 26px; font-size: 16px;">{AUDITION_INSTRUCTIONS}</div>
            </td>
          </tr>
        </table>

        <!-- Process steps -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
          <tr>
            <td style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 25px;">
              <h3 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">
                Audition Process
              </h3>

              <!-- Step 1 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                <tr>
                  <td style="padding: 15px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid #6c63ff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 35px; vertical-align: top;">
                          <div style="background-color: #6c63ff; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; text-align: center; line-height: 28px; font-size: 14px;">1</div>
                        </td>
                        <td style="padding-left: 15px; vertical-align: middle;">
                          <strong style="color: #2c3e50; font-size: 16px;">Access the audition portal</strong>
                          <br><span style="color: #6c757d; font-size: 14px;">Use the link below to access your personal audition space</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                <tr>
                  <td style="padding: 15px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid #6c63ff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 35px; vertical-align: top;">
                          <div style="background-color: #6c63ff; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; text-align: center; line-height: 28px; font-size: 14px;">2</div>
                        </td>
                        <td style="padding-left: 15px; vertical-align: middle;">
                          <strong style="color: #2c3e50; font-size: 16px;">Download materials</strong>
                          <br><span style="color: #6c757d; font-size: 14px;">Access and download any required sheet music or materials</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                <tr>
                  <td style="padding: 15px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid #6c63ff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 35px; vertical-align: top;">
                          <div style="background-color: #6c63ff; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; text-align: center; line-height: 28px; font-size: 14px;">3</div>
                        </td>
                        <td style="padding-left: 15px; vertical-align: middle;">
                          <strong style="color: #2c3e50; font-size: 16px;">Prepare your audition</strong>
                          <br><span style="color: #6c757d; font-size: 14px;">Practice the required pieces and prepare your performance</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Step 4 -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 15px; background-color: #ffffff; border-radius: 4px; border-left: 3px solid #6c63ff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 35px; vertical-align: top;">
                          <div style="background-color: #6c63ff; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 600; text-align: center; line-height: 28px; font-size: 14px;">4</div>
                        </td>
                        <td style="padding-left: 15px; vertical-align: middle;">
                          <strong style="color: #2c3e50; font-size: 16px;">Submit your recordings</strong>
                          <br><span style="color: #6c757d; font-size: 14px;">Upload your audio or video recordings (Max 50MB per file)</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Deadline -->
        {DEADLINE_BLOCK}

        <!-- Bouton d'accès -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="{REGISTRATION}" class="access-button"
                 style="display: inline-block; background-color: #6c63ff; color: white;
                        padding: 16px 32px; text-decoration: none; border-radius: 6px;
                        font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
                Access Audition Portal
              </a>
            </td>
          </tr>
        </table>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 26px; color: #6c757d; font-size: 15px; font-style: italic; text-align: center;">
          This link is personal and secure. You can access your audition portal at any time before the deadline.
        </p>

        <p class="content-text" style="margin: 0 0 25px 0; line-height: 26px; color: #495057; font-size: 16px;">
          Once you have submitted your audition, our evaluation team will review your performance and communicate our decision as soon as possible.
        </p>

        <p class="content-text" style="margin: 0 0 15px 0; line-height: 26px; color: #495057; font-size: 16px;">
          We wish you the best of luck with your audition.
        </p>

        <p class="content-text" style="margin: 0 0 30px 0; line-height: 26px; color: #495057; font-size: 16px;">
          Best regards,<br>
          <strong>The {PROJECT} Project Team</strong>
        </p>

        <!-- Informations de contact -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
          <tr>
            <td style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px;">
              <h4 style="margin: 0 0 12px 0; color: #495057; font-size: 16px; font-weight: 600;">Contact Information</h4>
              <div style="white-space: pre-line; color: #6c757d; font-size: 14px; line-height: 22px;">{TO_CONTACT}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Pied de page -->
    <tr>
      <td style="padding: 0 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="border-top: 1px solid #e9ecef; padding: 20px 0;">
              <p style="font-size: 12px; color: #adb5bd; line-height: 18px; margin: 0 0 8px 0; text-align: center;">
                This email was sent automatically. If you have any questions, please contact us using the information above.
              </p>

              <p style="font-size: 11px; color: #adb5bd; line-height: 16px; margin: 0; text-align: center;">
                <strong>Technical note:</strong> Supported file formats: MP3, WAV, MP4, AVI, MOV. Maximum file size: 50MB per upload.
              </p>
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

  async prepare() {
    const frontendUrl = this.getFrontendUrl()

    console.log(`📧 Preparing audition email for ${this.contact.email} - NO PDF ATTACHMENTS`)

    // Génération du lien d'audition
    const auditionUploadUrl = `${frontendUrl}/audition/${this.audition.secure_token}`
    console.log(`🎭 Generated audition link: ${auditionUploadUrl}`)

    // Préparer les données pour le template
    const contactName = `${this.contact.first_name || ''} ${this.contact.last_name || ''}`.trim()
    const projectName = this.project.name || ''
    const auditionInstructions =
      this.audition.instructions || 'Please prepare your best musical performance according to the requirements for your section.'

    // Préparer les informations de contact formatées
    const toContactDetails = this.responsible
      ? `${this.responsible.first_name || ''} ${this.responsible.last_name || ''}
Email: ${this.responsible.email || 'Not provided'}
Phone: ${this.responsible.phone || 'Not provided'}
Messenger: ${this.responsible.messenger || 'Not provided'}`
      : 'Please refer to the project coordinator for any questions.'

    // Préparer le bloc deadline
    const deadlineBlock = this.audition.deadline
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
          <tr>
            <td style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 18px; border-radius: 6px; text-align: center;">
              <strong style="color: #856404; font-size: 16px;">Submission Deadline: ${this.audition.deadline.toFormat('MMMM dd, yyyy \'at\' HH:mm')}</strong>
            </td>
          </tr>
        </table>`
      : ''

    // Logo professionnel
    const logoBlock = `<img src="${this.logoUrl}" alt="Melomania Logo" class="logo-img"
         style="max-width: 100px; width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px;">`

    // Charger le template
    let htmlContent = ''
    const template = await MailTemplate.query().where('name', 'audition_request.html').first()

    if (template) {
      htmlContent = template.content
      console.log('📧 Using template from database')
    } else {
      console.log('📧 Using default professional template')
      htmlContent = this.getDefaultTemplate()
    }

    // Variables pour le template
    const templateVariables = {
      URL: frontendUrl,
      NAME: contactName,
      PROJECT: projectName,
      REGISTRATION: auditionUploadUrl,
      TO_CONTACT: toContactDetails,
      AUDITION_INSTRUCTIONS: auditionInstructions,
      DEADLINE_BLOCK: deadlineBlock,
      LOGO_BLOCK: logoBlock,
    }

    console.log('🔧 Starting template variable replacement...')
    console.log('📝 Variables to replace:', Object.keys(templateVariables))

    htmlContent = this.replaceTemplateVariables(htmlContent, templateVariables)

    console.log('✅ Template variables replaced')
    console.log('📧 Final HTML content length:', htmlContent.length)

    // Configuration du message - SANS PIÈCES JOINTES
    this.message
      .to(this.contact.email)
      .from(this.from, 'Melomania')
      .subject(`${this.subject} - ${projectName}`)
      .html(htmlContent)
      .text(this.generateTextVersion(contactName, projectName, auditionInstructions, auditionUploadUrl, toContactDetails))

    console.log(`✅ Professional audition email prepared for ${this.contact.email} - NO ATTACHMENTS`)
  }

  /**
   * Générer une version texte propre de l'email
   */
  private generateTextVersion(
    contactName: string,
    projectName: string,
    instructions: string,
    auditionUrl: string,
    contactDetails: string
  ): string {
    const deadlineText = this.audition.deadline
      ? `\n\nIMPORTANT: Submission deadline is ${this.audition.deadline.toFormat('MMMM dd, yyyy \'at\' HH:mm')}`
      : ''

    // Nettoyer les instructions HTML pour le texte
    const cleanInstructions = instructions
      .replace(/<[^>]*>/g, '') // Supprimer les tags HTML
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()

    return `
MELOMANIA - Professional Musicians Platform

AUDITION REQUEST - ${projectName.toUpperCase()}

Dear ${contactName},

Thank you for your application to the ${projectName} project. We have reviewed your profile and would like to invite you to participate in an audition process.

AUDITION INSTRUCTIONS:
${cleanInstructions}

AUDITION PROCESS:
1. Access the audition portal using the link below
2. Download any required sheet music or materials
3. Prepare your audition according to the instructions
4. Submit your audio or video recordings (Max 50MB per file)

ACCESS YOUR AUDITION PORTAL:
${auditionUrl}

This link is personal and secure. You can access your audition portal at any time before the deadline.
${deadlineText}

Once you have submitted your audition, our evaluation team will review your performance and communicate our decision as soon as possible.

We wish you the best of luck with your audition.

Best regards,
The ${projectName} Project Team

---
CONTACT INFORMATION:
${contactDetails}

---
This email was sent automatically. If you have any questions, please contact us using the information above.

Technical note: Supported file formats: MP3, WAV, MP4, AVI, MOV. Maximum file size: 50MB per upload.
    `.trim()
  }
}
