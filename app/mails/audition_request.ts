import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Section from '#models/section'
import type Audition from '#models/audition'
import MailTemplate from '#models/mail_template'
import AuditionPdfFile from '#models/audition_pdf_file'

export default class AuditionRequest extends BaseMail {
  override from: string
  override subject = 'Audition Request with Sheet Music'

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
   * Template HTML optimisé pour tous les clients email
   */
  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Audition Request with Sheet Music</title>
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

      .upload-button {
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
              {LOGO_BLOCK}
            </td>

            <!-- Titre -->
            <td class="title-cell" style="text-align: center; vertical-align: middle;">
              <h1 class="title" style="margin: 0; font-size: 40px; color: #333333; line-height: 44px; font-weight: bold;">
                Melomania
              </h1>
              <p class="subtitle" style="font-size: 18px; margin: 8px 0 0 0; color: #666666; line-height: 22px;">
                The collaborative musicians platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Contenu principal -->
    <tr>
      <td class="content-cell" style="padding: 20px 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="text-align: center; padding-bottom: 20px;">
              <h2 style="color: #28a745; margin: 0; font-size: 24px;">🎵 Audition Request with Sheet Music 🎵</h2>
            </td>
          </tr>
        </table>

        <p class="content-text" style="margin: 0 0 15px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Dear <strong>{NAME}</strong>,
        </p>

        <p class="content-text" style="margin: 0 0 15px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Congratulations! Your application for the <strong>{PROJECT}</strong> project has caught our attention.
        </p>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 24px; color: #333333; font-size: 16px;">
          We would like to invite you to take an audition to more precisely evaluate your musical skills.
        </p>

        <!-- Instructions d'audition -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 10px 0; color: #28a745; font-size: 18px;">📋 Specific Instructions:</h3>
              <div style="margin: 10px 0; color: #333333; line-height: 24px;">{AUDITION_INSTRUCTIONS}</div>
            </td>
          </tr>
        </table>

        <!-- Section des pièces jointes -->
        {ATTACHMENTS_SECTION}

        <!-- Instructions étape par étape -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">
                ✅ How to proceed with your audition
              </h3>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 10px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #10b981; margin: 10px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="background-color: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">1</div>
                        </td>
                        <td style="padding-left: 15px;">
                          <strong style="color: #333333;">Download the sheet music</strong>
                          <br><small style="color: #666666;">PDF files are attached to this email. Save them to your computer.</small>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 10px;">
                <tr>
                  <td style="padding: 10px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #10b981;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="background-color: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">2</div>
                        </td>
                        <td style="padding-left: 15px;">
                          <strong style="color: #333333;">Study and practice</strong>
                          <br><small style="color: #666666;">Take time to properly work on the requested pieces.</small>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 10px;">
                <tr>
                  <td style="padding: 10px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #10b981;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="background-color: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">3</div>
                        </td>
                        <td style="padding-left: 15px;">
                          <strong style="color: #333333;">Record your performance</strong>
                          <br><small style="color: #666666;">Audio (MP3, WAV) or video (MP4, AVI, MOV) - Max 50MB per file.</small>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 10px;">
                <tr>
                  <td style="padding: 10px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #10b981;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="background-color: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center; line-height: 30px;">4</div>
                        </td>
                        <td style="padding-left: 15px;">
                          <strong style="color: #333333;">Upload to the audition portal</strong>
                          <br><small style="color: #666666;">Use the link below to send your recordings.</small>
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="{REGISTRATION}" class="upload-button"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;
                        font-weight: bold; font-size: 16px;">
                🎬 Access audition portal
              </a>
            </td>
          </tr>
        </table>

        <p class="content-text" style="margin: 0 0 15px 0; line-height: 24px; color: #6c757d; font-size: 16px; font-style: italic;">
          This link is personal and secure. You can also download the sheet music again from there if needed.
        </p>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Once your audition is submitted, our team will evaluate it and communicate our decision to you as soon as possible.
        </p>

        <p class="content-text" style="margin: 0 0 15px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Good luck with your audition!
        </p>

        <p class="content-text" style="margin: 0 0 20px 0; line-height: 24px; color: #333333; font-size: 16px;">
          Best regards,<br>
          <strong>The {PROJECT} project team</strong>
        </p>

        <!-- Informations de contact -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 16px;">📞 Contact Information:</h4>
              <div style="white-space: pre-line; color: #6c757d; font-size: 14px; line-height: 20px;">{TO_CONTACT}</div>
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
            <td style="border-top: 1px solid #dddddd; padding: 20px 0;">
              <p style="font-size: 12px; color: #888888; line-height: 16px; margin: 0 0 10px 0;">
                This email was sent automatically. If you have any questions, please feel free to contact us.
              </p>

              <p style="font-size: 11px; color: #999999; line-height: 14px; margin: 15px 0 0 0; border-top: 1px solid #eeeeee; padding-top: 10px;">
                <strong>Technical note:</strong> If you don't see the PDF attachments, check your email client or download them directly from the audition portal.
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

    // Charger les PDFs associés à cette audition
    const pdfFiles = await AuditionPdfFile.query()
      .where('audition_id', this.audition.id)
      .preload('file')
      .orderBy('order', 'asc')
      .orderBy('title', 'asc')

    console.log(
      `📧 Preparing audition email for ${this.contact.email} with ${pdfFiles.length} PDF attachments`
    )

    // Génération du lien d'audition
    const auditionUploadUrl = `${frontendUrl}/audition/${this.audition.secure_token}`
    console.log(`🎭 Generated audition link: ${auditionUploadUrl}`)

    // Préparer les données pour le template
    const contactName = `${this.contact.first_name || ''} ${this.contact.last_name || ''}`.trim()
    const projectName = this.project.name || ''
    const auditionInstructions =
      this.audition.instructions || 'Please prepare your best musical performance.'

    // Préparer les informations de contact formatées
    const toContactDetails = this.responsible
      ? `${this.responsible.first_name || ''} ${this.responsible.last_name || ''}
Email: ${this.responsible.email || 'No email provided'}
Phone: ${this.responsible.phone || 'No phone provided'}
Messenger: ${this.responsible.messenger || 'No messenger provided'}`
      : 'No contact details available'

    // Préparer le bloc deadline
    const deadlineBlock = this.audition.deadline
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; text-align: center;">
              <strong style="color: #856404; font-size: 16px;">⏰ Deadline: ${this.audition.deadline.toFormat('dd/MM/yyyy at HH:mm')}</strong>
            </td>
          </tr>
        </table>`
      : ''

    // Préparer la section des attachements
    const attachmentsSection =
      pdfFiles.length > 0
        ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 18px;">
                📎 Sheet Music Attached (${pdfFiles.length} file${pdfFiles.length > 1 ? 's' : ''})
              </h3>
              <p style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 16px;">The following PDF files are attached to this email:</p>

              ${pdfFiles
          .map(
            (pdf) => `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 10px 0;">
                <tr>
                  <td style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: middle;">
                          <span style="color: #dc2626; font-size: 24px;">📄</span>
                        </td>
                        <td style="padding-left: 15px; vertical-align: middle;">
                          <strong style="color: #333333; font-size: 16px;">${pdf.title}</strong>
                          <br><small style="color: #64748b;">PDF attachment</small>
                        </td>
                        <td style="text-align: right; vertical-align: middle;">
                          <span style="background-color: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">PDF</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
          )
          .join('')}

              <p style="font-size: 14px; color: #475569; margin: 15px 0 0 0; font-style: italic;">
                💡 <strong>Tip:</strong> If you don't see the attachments, they can also be downloaded from the audition portal.
              </p>
            </td>
          </tr>
        </table>`
        : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 18px;">
                📎 Sheet Music Information
              </h3>
              <p style="color: #0c4a6e; font-size: 16px; margin: 0;">Sheet music will be provided via the audition portal.</p>
            </td>
          </tr>
        </table>`

    // Logo depuis l'URL - simple et efficace !
    const logoBlock = `<img src="${this.logoUrl}" alt="Melomania Logo" class="logo-img"
         style="max-width: 125px; width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 6px;">`

    // Charger le template
    let htmlContent = ''
    const template = await MailTemplate.query().where('name', 'audition_request.html').first()

    if (template) {
      htmlContent = template.content
      console.log('📧 Using template from database')
    } else {
      console.log('📧 Using default template')
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
      ATTACHMENTS_SECTION: attachmentsSection,
      DEADLINE_BLOCK: deadlineBlock,
      LOGO_BLOCK: logoBlock,
    }

    console.log('🔧 Starting template variable replacement...')
    console.log('📝 Variables to replace:', Object.keys(templateVariables))

    // Débogage : vérifier si les variables existent dans le template
    console.log('🔍 Template variables check:')
    Object.keys(templateVariables).forEach((key) => {
      const found = htmlContent.includes(`{${key}}`)
      console.log(`  {${key}}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`)
    })

    htmlContent = this.replaceTemplateVariables(htmlContent, templateVariables)

    console.log('✅ Template variables replaced')
    console.log('📧 Final HTML content length:', htmlContent.length)

    // Configuration du message de base
    this.message
      .to(this.contact.email)
      .from(this.from, 'Melomania')  // Nom d'affichage personnalisé
      .subject(
        `${this.subject}${pdfFiles.length > 0 ? ` - ${pdfFiles.length} sheet music file(s) attached` : ''}`
      )
      .html(htmlContent)

    // Attacher tous les PDFs en pièces jointes
    let attachedCount = 0
    let attachmentErrors: string[] = []

    for (const pdfFile of pdfFiles) {
      try {
        const filePath = pdfFile.file.path

        if (!filePath) {
          attachmentErrors.push(`PDF "${pdfFile.title}": missing file path`)
          continue
        }

        // Vérifier que le fichier existe physiquement
        const fs = await import('node:fs/promises')
        try {
          await fs.access(filePath)
        } catch (accessError) {
          attachmentErrors.push(`PDF "${pdfFile.title}": file not found (${filePath})`)
          continue
        }

        // Générer un nom de fichier propre pour la pièce jointe
        const cleanFileName = `${pdfFile.title.replace(/[^a-zA-Z0-9\-_.]/g, '_')}.pdf`

        // Attacher le fichier
        this.message.attach(filePath, {
          filename: cleanFileName,
          contentType: 'application/pdf',
          contentDisposition: 'attachment',
        } as any)

        attachedCount++
        console.log(`📎 Attached PDF: "${pdfFile.title}" as "${cleanFileName}"`)
      } catch (error) {
        attachmentErrors.push(
          `PDF "${pdfFile.title}": attachment error (${(error as Error).message})`
        )
        console.error(`❌ Error attaching PDF "${pdfFile.title}":`, error)
      }
    }

    // Log du résultat des attachements
    if (attachedCount > 0) {
      console.log(
        `✅ Successfully attached ${attachedCount}/${pdfFiles.length} PDFs to audition email`
      )
    }

    if (attachmentErrors.length > 0) {
      console.warn(`⚠️ PDF attachment errors:`, attachmentErrors)
    }

    // Si aucune pièce jointe n'a pu être ajoutée mais qu'il y en avait dans la base
    if (pdfFiles.length > 0 && attachedCount === 0) {
      console.error(`❌ Failed to attach any PDFs for audition ${this.audition.id}`)
    }

    console.log(`📧 Email preparation completed for ${this.contact.email} with logo from URL`)
  }
}
