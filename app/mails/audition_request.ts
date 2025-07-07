// app/mails/audition_request.ts - Version avec détection automatique d'environnement CORRIGÉE

import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Section from '#models/section'
import type Audition from '#models/audition'
import MailTemplate from '#models/mail_template'
import AuditionPdfFile from '#models/audition_pdf_file'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentFilename = fileURLToPath(import.meta.url)
const currentDirname = path.dirname(currentFilename)

export default class AuditionRequest extends BaseMail {
  override from: string
  override subject = "Audition Request with Sheet Music"

  constructor(
    private contact: Contact,
    private project: Project,
    private _section: Section, // ✅ Préfixe avec underscore
    private audition: Audition,
    private responsible: any = null
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
  }

  /**
   * 🎯 DÉTECTION AUTOMATIQUE D'ENVIRONNEMENT
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
      PORT: port
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
        // Serveur de test (détection par domaine universe.wf)
        const frontendUrl = 'http://tool.sc1ciro3903.universe.wf'
        console.log(`🧪 Auto-detected TEST environment: ${frontendUrl}`)
        return frontendUrl
      }

      if (nodeEnv === 'production' || host.includes('melomania.be')) {
        // Serveur de production (détection par domaine melomania.be)
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

  async prepare() {
    const frontendUrl = this.getFrontendUrl()
    const logoPath = path.join(
      currentDirname,
      '..',
      '..',
      'resources',
      'mail_assets',
      'logoMelomania.png'
    )

    // Charger les PDFs associés à cette audition
    const pdfFiles = await AuditionPdfFile.query()
      .where('audition_id', this.audition.id)
      .preload('file')
      .orderBy('order', 'asc')
      .orderBy('title', 'asc')

    console.log(`📧 Preparing audition email for ${this.contact.email} with ${pdfFiles.length} PDF attachments`)

    // 🎯 GÉNÉRATION DU LIEN D'AUDITION
    const auditionUploadUrl = `${frontendUrl}/audition/${this.audition.secure_token}`
    console.log(`🎭 Generated audition link: ${auditionUploadUrl}`)

    let htmlContent = ''
    let template = await MailTemplate.query().where('name', 'audition_request.html').first()

    if (template) {
      htmlContent = template.content
      console.log('📧 Using template from database')
    } else {
      console.log('📧 Using default template')
      // ✅ CORRECTION : Template par défaut avec variables NON ÉCHAPPÉES
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Audition Request with Sheet Music</title>
  <style>
    /* Mobile responsive styles */
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
      .logo {
        max-width: 100px !important;
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
      }
      .subtitle {
        font-size: 14px !important;
      }
      .logo {
        max-width: 80px !important;
      }
    }

    .upload-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin: 20px 0;
      transition: transform 0.2s;
    }

    .upload-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .requirements {
      background-color: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }

    .deadline {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 10px;
      border-radius: 8px;
      margin: 15px 0;
      text-align: center;
      font-weight: bold;
      color: #856404;
    }

    .attachments-section {
      background-color: #f0f9ff;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    .attachment-item {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px;
      margin: 10px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .attachment-icon {
      color: #dc2626;
      font-size: 24px;
      margin-right: 15px;
    }

    .attachment-badge {
      background-color: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    /* Step-by-step instruction styles */
    .step-by-step {
      background-color: #ecfdf5;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      margin: 15px 0;
      padding: 10px;
      background-color: #ffffff;
      border-radius: 6px;
      border-left: 4px solid #10b981;
    }

    .step-number {
      background-color: #10b981;
      color: white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 15px;
      flex-shrink: 0;
    }

    .contact-info {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div class="container" style="max-width: 600px; width: 100%; margin: 20px auto; background-color: #ffffff; border-radius: 10px; padding: 20px; color: #333333; box-shadow: 0 0 10px rgba(0,0,0,0.05); box-sizing: border-box;">

    <!-- Header with logo and name -->
    <div class="header-flex" style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; text-align: center;">
      <img src="cid:logoMelomania.png" alt="Melomania Logo" class="logo"
           style="max-width: 125px; width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
      <div style="flex: 1; min-width: 200px;">
        <h1 class="title" style="margin: 0; font-size: 40px; color: #333; line-height: 1.2;">Melomania</h1>
        <p class="subtitle" style="font-size: 18px; margin-top: 8px; color: #666; line-height: 1.3;">The collaborative musicians platform</p>
      </div>
    </div>

    <!-- Main content -->
    <div class="content-padding" style="padding: 0 10px;">
      <h2 style="color: #28a745; text-align: center; margin-bottom: 20px;">🎵 Audition Request with Sheet Music 🎵</h2>

      <p style="margin-bottom: 15px; line-height: 1.5;">Dear <strong>\${NAME}</strong>,</p>

      <p style="margin-bottom: 15px; line-height: 1.5;">Congratulations! Your application for the <strong>\${PROJECT}</strong> project has caught our attention.</p>

      <p style="margin-bottom: 20px; line-height: 1.5;">We would like to invite you to take an audition to more precisely evaluate your musical skills.</p>

      <!-- Audition instructions -->
      <div class="requirements">
        <h3 style="margin-top: 0; color: #28a745;">📋 Specific Instructions:</h3>
        <div style="margin: 10px 0;">\${AUDITION_INSTRUCTIONS}</div>
      </div>

      <!-- Attachments section -->
      \${ATTACHMENTS_SECTION}

      <!-- Step-by-step instructions -->
      <div class="step-by-step">
        <h3 style="margin-top: 0; color: #065f46; display: flex; align-items: center;">
          <span style="margin-right: 10px;">✅</span>
          How to proceed with your audition
        </h3>

        <div class="step-item">
          <div class="step-number">1</div>
          <div>
            <strong>Download the sheet music</strong>
            <br><small style="color: #666;">PDF files are attached to this email. Save them to your computer.</small>
          </div>
        </div>

        <div class="step-item">
          <div class="step-number">2</div>
          <div>
            <strong>Study and practice</strong>
            <br><small style="color: #666;">Take time to properly work on the requested pieces.</small>
          </div>
        </div>

        <div class="step-item">
          <div class="step-number">3</div>
          <div>
            <strong>Record your performance</strong>
            <br><small style="color: #666;">Audio (MP3, WAV) or video (MP4, AVI, MOV) - Max 50MB per file.</small>
          </div>
        </div>

        <div class="step-item">
          <div class="step-number">4</div>
          <div>
            <strong>Upload to the audition portal</strong>
            <br><small style="color: #666;">Use the link below to send your recordings.</small>
          </div>
        </div>
      </div>

      <!-- Deadline -->
      \${DEADLINE_BLOCK}

      <!-- Access button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="\${REGISTRATION}" class="upload-button" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0;">
          🎬 Access audition portal
        </a>
      </div>

      <p style="margin-bottom: 15px; line-height: 1.5; font-style: italic; color: #6c757d;">This link is personal and secure. You can also download the sheet music again from there if needed.</p>

      <p style="margin-bottom: 20px; line-height: 1.5;">Once your audition is submitted, our team will evaluate it and communicate our decision to you as soon as possible.</p>

      <p style="margin-bottom: 15px; line-height: 1.5;">Good luck with your audition!</p>

      <p style="margin-bottom: 20px; line-height: 1.5;">Best regards,<br />
      <strong>The \${PROJECT} project team</strong></p>

      <!-- Contact information -->
      <div class="contact-info">
        <h4 style="margin-top: 0; color: #495057;">📞 Contact Information:</h4>
        <div style="white-space: pre-line; color: #6c757d; font-size: 14px;">\${TO_CONTACT}</div>
      </div>
    </div>

    <!-- Footer -->
    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;" />
    <div class="content-padding" style="padding: 0 10px;">
      <p style="font-size: 12px; color: #888; line-height: 1.4; margin-bottom: 10px;">This email was sent automatically. If you have any questions, please feel free to contact us.</p>

      <!-- Technical note -->
      <p style="font-size: 11px; color: #999; line-height: 1.3; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
        <strong>Technical note:</strong> If you don't see the PDF attachments, check your email client or download them directly from the audition portal.
      </p>
    </div>
  </div>
</body>
</html>`
    }

    // Préparer les informations de contact formatées
    const toContactDetails = this.responsible ?
      `${this.responsible.first_name || ''} ${this.responsible.last_name || ''}
       Email: ${this.responsible.email || 'No email provided'}
       Phone: ${this.responsible.phone || 'No phone provided'}
       Messenger: ${this.responsible.messenger || 'No messenger provided'}` :
      'No contact details available'

    const auditionInstructions = this.audition.instructions || 'Please prepare your best musical performance.'

    const deadlineBlock = this.audition.deadline
      ? `<div class="deadline">
          ⏰ <strong>Deadline:</strong> ${this.audition.deadline.toFormat('dd/MM/yyyy at HH:mm')}
         </div>`
      : ''

    const attachmentsSection = pdfFiles.length > 0
      ? `<div class="attachments-section">
          <h3 style="margin-top: 0; color: #0369a1; display: flex; align-items: center;">
            <span style="margin-right: 10px;">📎</span>
            Sheet Music Attached (${pdfFiles.length} file${pdfFiles.length > 1 ? 's' : ''})
          </h3>
          <p style="margin-bottom: 15px; color: #0c4a6e;">The following PDF files are attached to this email:</p>

          ${pdfFiles.map(pdf => `
          <div class="attachment-item">
            <div style="display: flex; align-items: center;">
              <span class="attachment-icon">📄</span>
              <div>
                <strong>${pdf.title}</strong>
                <br><small style="color: #64748b;">PDF attachment</small>
              </div>
            </div>
            <span class="attachment-badge">PDF</span>
          </div>`).join('')}

          <p style="font-size: 14px; color: #475569; margin-top: 15px; font-style: italic;">
            💡 <strong>Tip:</strong> If you don't see the attachments, they can also be downloaded from the audition portal.
          </p>
        </div>`
      : `<div class="attachments-section">
          <h3 style="margin-top: 0; color: #0369a1; display: flex; align-items: center;">
            <span style="margin-right: 10px;">📎</span>
            Sheet Music Information
          </h3>
          <p style="color: #0c4a6e;">Sheet music will be provided via the audition portal.</p>
        </div>`

    // ✅ SOLUTION SIMPLE : Remplacer d'abord les variables échappées, puis les variables normales
    console.log('🔧 Starting template variable replacement...')

    // Étape 1 : Remplacer les variables échappées (\${VARIABLE})
    htmlContent = htmlContent
      .replace(/\\\$\{URL\}/g, frontendUrl)
      .replace(/\\\$\{NAME\}/g, `${this.contact.first_name || ''} ${this.contact.last_name || ''}`.trim())
      .replace(/\\\$\{PROJECT\}/g, this.project.name || '')
      .replace(/\\\$\{REGISTRATION\}/g, auditionUploadUrl)
      .replace(/\\\$\{TO_CONTACT\}/g, toContactDetails)
      .replace(/\\\$\{AUDITION_INSTRUCTIONS\}/g, auditionInstructions)
      .replace(/\\\$\{ATTACHMENTS_SECTION\}/g, attachmentsSection)
      .replace(/\\\$\{DEADLINE_BLOCK\}/g, deadlineBlock)

    // Étape 2 : Remplacer aussi les variables non échappées (au cas où)
    htmlContent = htmlContent
      .replace(/\$\{URL\}/g, frontendUrl)
      .replace(/\$\{NAME\}/g, `${this.contact.first_name || ''} ${this.contact.last_name || ''}`.trim())
      .replace(/\$\{PROJECT\}/g, this.project.name || '')
      .replace(/\$\{REGISTRATION\}/g, auditionUploadUrl)
      .replace(/\$\{TO_CONTACT\}/g, toContactDetails)
      .replace(/\$\{AUDITION_INSTRUCTIONS\}/g, auditionInstructions)
      .replace(/\$\{ATTACHMENTS_SECTION\}/g, attachmentsSection)
      .replace(/\$\{DEADLINE_BLOCK\}/g, deadlineBlock)

    console.log('✅ Template variables replaced')
    console.log('📝 Sample content check:', htmlContent.includes(this.contact.first_name || 'NO_NAME') ? 'Variables replaced successfully' : 'Variables NOT replaced')
    console.log('📧 Final HTML content length:', htmlContent.length)

    // Configuration du message de base
    this.message
      .to(this.contact.email)
      .from(`Melomania <${env.get('SMTP_USERNAME')}>`)
      .subject(`${this.subject}${pdfFiles.length > 0 ? ` - ${pdfFiles.length} sheet music file(s) attached` : ''}`)
      .html(htmlContent)
      .attach(logoPath, { cid: 'logoMelomania.png' } as any)

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
          contentDisposition: 'attachment'
        } as any)

        attachedCount++
        console.log(`📎 Attached PDF: "${pdfFile.title}" as "${cleanFileName}"`)

      } catch (error) {
        attachmentErrors.push(`PDF "${pdfFile.title}": attachment error (${(error as Error).message})`)
        console.error(`❌ Error attaching PDF "${pdfFile.title}":`, error)
      }
    }

    // Log du résultat des attachements
    if (attachedCount > 0) {
      console.log(`✅ Successfully attached ${attachedCount}/${pdfFiles.length} PDFs to audition email`)
    }

    if (attachmentErrors.length > 0) {
      console.warn(`⚠️ PDF attachment errors:`, attachmentErrors)
    }

    // Si aucune pièce jointe n'a pu être ajoutée mais qu'il y en avait dans la base
    if (pdfFiles.length > 0 && attachedCount === 0) {
      console.error(`❌ Failed to attach any PDFs for audition ${this.audition.id}`)
    }

    console.log(`📧 Email preparation completed`)
  }
}
