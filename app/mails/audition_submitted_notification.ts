// app/mails/audition_submitted_notification.ts - Version avec variables standardisées
import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Audition from '#models/audition'
import MailTemplate from '#models/mail_template'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentFilename = fileURLToPath(import.meta.url)
const currentDirname = path.dirname(currentFilename)

export default class AuditionSubmittedNotification extends BaseMail {
  from = env.get('SMTP_USERNAME') || 'benskotlemogo@gmail.com'
  subject = "Nouvelle audition soumise"

  constructor(
    private responsibles: Contact[],
    private project: Project,
    private audition: Audition,
    private participant: any
  ) {
    super()
  }

  async prepare() {
    const frontendUrl = env.get('FRONTEND_URL') || 'http://localhost:5173'
    const logoPath = path.join(
      currentDirname,
      '..',
      '..',
      'resources',
      'mail_assets',
      'logoMelomania.png'
    )

    let htmlContent = ''

    // Utiliser le template par défaut de notification d'audition soumise
    let template = await MailTemplate.query().where('name', 'audition_submitted_notification.html').first()

    if (template) {
      htmlContent = template.content
    } else {
      // Template par défaut avec variables standardisées
      htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nouvelle audition soumise</title>
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
      .button {
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

    .button {
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

    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }

    .participant-info {
      background-color: #e3f2fd;
      border: 1px solid #2196f3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <div class="container" style="max-width: 600px; width: 100%; margin: 20px auto; background-color: #ffffff; border-radius: 10px; padding: 20px; color: #333333; box-shadow: 0 0 10px rgba(0,0,0,0.05); box-sizing: border-box;">

    <!-- En-tête avec logo et nom -->
    <div class="header-flex" style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; text-align: center;">
      <img src="cid:logoMelomania.png" alt="Logo Melomania" class="logo"
           style="max-width: 125px; width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
      <div style="flex: 1; min-width: 200px;">
        <h1 class="title" style="margin: 0; font-size: 40px; color: #333; line-height: 1.2;">Melomania</h1>
        <p class="subtitle" style="font-size: 18px; margin-top: 8px; color: #666; line-height: 1.3;">La plateforme collaborative des musiciens</p>
      </div>
    </div>

    <!-- Contenu principal -->
    <div class="content-padding" style="padding: 0 10px;">
      <h2 style="color: #dc3545; text-align: center; margin-bottom: 20px;">🚨 Nouvelle audition soumise</h2>

      <p style="margin-bottom: 15px; line-height: 1.5;">Bonjour,</p>

      <p style="margin-bottom: 15px; line-height: 1.5;">Une nouvelle audition vient d'être soumise pour le projet <strong>\${PROJECT}</strong>.</p>

      <!-- Informations sur le participant -->
      <div class="participant-info">
        <h3 style="margin-top: 0; color: #1976d2;">👤 Informations sur le participant :</h3>
        <p style="margin: 5px 0;"><strong>Nom :</strong> \${NAME}</p>
        <p style="margin: 5px 0;"><strong>Projet :</strong> \${PROJECT}</p>
      </div>

      <p style="margin-bottom: 20px; line-height: 1.5;">Vous pouvez maintenant consulter et évaluer cette audition dans votre espace de gestion.</p>

      <!-- Bouton d'accès -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="\${REGISTRATION}" class="button" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0;">
          🎬 Gérer les auditions
        </a>
      </div>

      <p style="margin-bottom: 15px; line-height: 1.5; font-style: italic; color: #6c757d;">Accédez à votre espace de gestion pour évaluer cette audition et communiquer votre décision.</p>

      <p style="margin-bottom: 20px; line-height: 1.5;">Cordialement,<br />
      <strong>L'équipe Melomania</strong></p>

      <!-- Informations de contact -->
      <div class="info-box">
        <h4 style="margin-top: 0; color: #28a745;">📞 Contact :</h4>
        <div style="margin: 10px 0;">\${TO_CONTACT}</div>
      </div>
    </div>

    <!-- Pied de page -->
    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;" />
    <div class="content-padding" style="padding: 0 10px;">
      <p style="font-size: 12px; color: #888; line-height: 1.4; margin-bottom: 10px;">Cet email a été envoyé automatiquement. Si vous avez des questions, n'hésitez pas à nous contacter.</p>

      <p style="font-size: 11px; color: #999; line-height: 1.3; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
        <strong>Note :</strong> Cette notification est envoyée aux responsables du projet lors de chaque nouvelle soumission d'audition.
      </p>
    </div>
  </div>
</body>
</html>`
    }

    // Préparer les informations de contact formatées
    const participantContact = this.participant.contact
    const participantName = `${participantContact.firstName || ''} ${participantContact.lastName || ''}`.trim()
    
    // Informations de contact du responsable (premier responsable de la liste)
    const toContactDetails = this.responsibles.length > 0 ? 
      this.responsibles.map(responsible => 
        `${responsible.first_name || ''} ${responsible.last_name || ''}
         Email: ${responsible.email || 'No email provided'}
         Phone: ${responsible.phone || 'No phone provided'}
         Messenger: ${responsible.messenger || 'No messenger provided'}`
      ).join('\n\n') :
      'No contact details available'

    // URL pour la gestion des auditions
    const auditionManagementUrl = `${frontendUrl}/projects/${this.project.id}/management/auditions`

    // Envoyer à tous les responsables du projet
    for (const responsible of this.responsibles) {
      // Remplacer toutes les variables standardisées dans le template
      let personalizedContent = htmlContent
        .replace(/\$\{URL\}/g, frontendUrl)
        .replace(/\$\{NAME\}/g, participantName)
        .replace(/\$\{PROJECT\}/g, this.project.name || '')
        .replace(/\$\{REGISTRATION\}/g, auditionManagementUrl)
        .replace(/\$\{TO_CONTACT\}/g, toContactDetails)

      this.message
        .to(responsible.email)
        .from(this.from)
        .subject(this.subject)
        .html(personalizedContent)
        .attach(logoPath, { cid: 'logoMelomania.png' } as any)
    }
  }
}