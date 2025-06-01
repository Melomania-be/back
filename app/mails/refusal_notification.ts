import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import type Contact from '#models/contact'
import type Project from '#models/project'
import type Section from '#models/section'
import MailTemplate from '#models/mail_template'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentFilename = fileURLToPath(import.meta.url)
const currentDirname = path.dirname(currentFilename)

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
    const logoPath = path.join(
      currentDirname,
      '..',
      '..',
      'resources',
      'mail_assets',
      'logoMelomania.png'
    )

    let htmlContent = ''

    // ✅ CAS 1 : Message personnalisé → envoyer uniquement ce message dans une belle mise en page
    if (this.customMessage && this.customMessage.trim() !== '') {
      htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Message de refus</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; padding: 20px; font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; box-shadow: 0 0 10px rgba(0,0,0,0.05);">

    <!-- En-tête -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; text-align: center;">
      <img src="cid:logoMelomania.png" alt="Logo Melomania"
           style="max-width: 125px; width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
      <div style="flex: 1; min-width: 200px;">
        <h1 style="margin: 0; font-size: 40px; color: #333;">Melomania</h1>
        <p style="font-size: 18px; margin-top: 8px; color: #666;">La plateforme collaborative des musiciens</p>
      </div>
    </div>

    <!-- Message personnalisé -->
    <div style="font-size: 16px; line-height: 1.6;">
      ${this.customMessage}
    </div>

  </div>
</body>
</html>
      `
    } else {
      // ✅ CAS 2 : Aucun message personnalisé → on utilise le template complet

      let template = await MailTemplate.query().where('name', 'refusal_notification.html').first()

      if (template) {
        htmlContent = template.content
      } else {
        htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Refus de participation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; padding: 20px; font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; box-shadow: 0 0 10px rgba(0,0,0,0.05);">

    <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 30px; text-align: center;">
      <img src="cid:logoMelomania.png" alt="Logo Melomania"
           style="max-width: 125px; width: 100%; height: auto; border-radius: 6px; display: block; margin: 0 auto;">
      <div style="flex: 1; min-width: 200px;">
        <h1 style="margin: 0; font-size: 40px; color: #333;">Melomania</h1>
        <p style="font-size: 18px; margin-top: 8px; color: #666;">La plateforme collaborative des musiciens</p>
      </div>
    </div>

    <p>Bonjour <strong>\${PARTICIPANT_FIRSTNAME} \${PARTICIPANT_LASTNAME}</strong>,</p>

    <p>Nous vous remercions pour l'intérêt que vous avez porté à notre projet musical <strong>\${PROJECT_NAME}</strong>.</p>

    <p>Après étude de votre candidature dans la section <strong>\${PARTICIPANT_SECTION}</strong>, nous regrettons de vous informer que nous ne pouvons pas donner une suite favorable à votre demande de participation.</p>

    \${REFUSAL_MESSAGE_BLOCK}

    <p>Cette décision ne remet nullement en cause vos compétences musicales. Elle peut être liée à :</p>
    <ul style="padding-left: 20px;">
      <li>Un nombre limité de places</li>
      <li>Un équilibre recherché entre les sections</li>
      <li>Des contraintes logistiques spécifiques au projet</li>
      <li>Une disponibilité requise difficile à garantir</li>
    </ul>

    <p>Nous vous encourageons à postuler pour nos prochains projets. Votre profil pourrait parfaitement convenir à d’autres opportunités.</p>

    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin-top: 25px;">
      <h3 style="margin-top: 0;">Restez informé(e)</h3>
      <p>Pour suivre nos prochaines auditions et projets :</p>
      <ul style="padding-left: 20px;">
        <li>Consultez régulièrement notre site</li>
        <li>Suivez-nous sur les réseaux sociaux</li>
        <li>Inscrivez-vous à notre newsletter</li>
      </ul>
    </div>

    <p style="margin-top: 30px;">Merci encore pour votre candidature.</p>

    <p>Cordialement,<br />
    <strong>L’équipe du projet \${PROJECT_NAME}</strong></p>

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;" />
    <p style="font-size: 12px; color: #888;">Cet email a été envoyé automatiquement. Si vous avez des questions, n'hésitez pas à nous contacter.</p>
    \${CONTACT_EMAIL_BLOCK}
  </div>
</body>
</html>`
      }

      const refusalMessageBlock = ''
      const contactEmailBlock = this.responsible?.email
        ? `<p>Contact : <a href="mailto:${this.responsible.email}">${this.responsible.email}</a></p>`
        : ''

      htmlContent = htmlContent
        .replace(/\$\{URL\}/g, url)
        .replace(/\$\{PARTICIPANT_FIRSTNAME\}/g, this.contact.first_name || '')
        .replace(/\$\{PARTICIPANT_LASTNAME\}/g, this.contact.last_name || '')
        .replace(/\$\{PARTICIPANT_SECTION\}/g, this.section.name || '')
        .replace(/\$\{PROJECT_NAME\}/g, this.project.name || '')
        .replace(/\$\{REFUSAL_MESSAGE_BLOCK\}/g, refusalMessageBlock)
        .replace(/\$\{CONTACT_EMAIL_BLOCK\}/g, contactEmailBlock)
    }

    this.message
      .to(this.contact.email)
      .from(this.from)
      .subject(this.subject)
      .html(htmlContent)
      .attach(logoPath, { cid: 'logoMelomania.png' } as any)
  }
}
