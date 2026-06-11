import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import Callsheet from '#models/callsheet'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import app from '@adonisjs/core/services/app'

export default class TemplatePreparation extends BaseMail {
  contact: { id: number; first_name: string; last_name: string; email: string }
  project: { id: number; name: string } | null | undefined
  toContact: { firstName: string; lastName: string; email: string; phone: string; messenger: string }
  registration: { id: number; project_id: number } | null | undefined
  from: string
  htmlFromDb: string
  callsheet: Callsheet | null | undefined

  constructor(
    htmlFromDb: string,
    contact: { id: number; first_name: string; last_name: string; email: string },
    project: { id: number; name: string } | null | undefined,
    callsheet: Callsheet | null,
    to_contact: { firstName: string; lastName: string; email: string; phone: string; messenger: string },
    registration: { id: number; project_id: number } | null | undefined
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.project = project
    this.callsheet = callsheet
    this.toContact = to_contact
    this.registration = registration
    this.htmlFromDb = htmlFromDb
  }

  prepare() {
    // CORRECTION V-11 : Utilisation cohérente de 'url' (en minuscule)
    const url = env.get('URL') || ''
    const imageFileRegex = /<img\s+file=([^>]+\.(jpg|png))\s*\/?>/g

    let htmlContent = this.htmlFromDb
      .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
      .replace(/\${URL}/g, url) // Remplace les balises de template
      .replace(/\${url}/g, url) // Supporte aussi les minuscules par sécurité
      .replace(/\${PROJECT}/g, this.project?.name ?? '')
      .replace(
        /\${CALLSHEET}/g,
        this.callsheet ? `${url}/call_sheets/${this.callsheet.id}/${this.contact.id}` : ''
      )
      .replace(
        /\${TO_CONTACT}/g,
        '<br>' +
        this.toContact.firstName + ' ' + this.toContact.lastName +
        '<br> mail : ' + this.toContact.email +
        '<br> phone : ' + this.toContact.phone +
        '<br> messenger :  ' + this.toContact.messenger
      )

    if (this.registration) {
      htmlContent = htmlContent.replace(/\${REGISTRATION}/g, `${url}/registration/${this.registration.id}`)
    } else {
      htmlContent = htmlContent.replace(/\${REGISTRATION}/g, `${url}/registration/default_value`)
    }

    const matches = htmlContent.match(imageFileRegex)

    if (matches) {
      for (const match of matches) {
        const pathMatch = match.match(/file=([^\s>]+)/)
        if (pathMatch) {
          const rawFilePath = pathMatch[1]

          // CORRECTION V-01 (Path Traversal / LFI) : Sécurité Absolue
          const baseUploadDir = path.resolve(app.makePath('uploads'))

          // On force l'extraction du nom de fichier pur, ignorant toute tentative de "../"
          const safeBaseName = path.basename(rawFilePath)
          const resolvedPath = path.resolve(baseUploadDir, safeBaseName)

          // Double vérification paranoiaque
          if (!resolvedPath.startsWith(baseUploadDir)) {
            console.error(`Alerte de sécurité LFI : tentative bloquée pour ${rawFilePath}`)
            continue // On ignore cette image silencieusement plutôt que de faire crasher le mail
          }

          const fileURL = pathToFileURL(resolvedPath).href
          const cid = `image-${Date.now()}`
          htmlContent = htmlContent.replace(
            match,
            match.replace(/file=([^\s>]+)/, `src="cid:${cid}"`)
          )
          this.message.attach(fileURLToPath(fileURL), {
            contentType: 'image/png', // Idéalement, devrait être dynamique (image/jpeg etc.)
            filename: safeBaseName,
            headers: { 'Content-ID': cid },
          })
        }
      }
    }

    this.message
      .to(this.contact.email)
      .from(`Melomania <${this.from}>`)
      .subject('Notification')
      .html(htmlContent)
  }
}
