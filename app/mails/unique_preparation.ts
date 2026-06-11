import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import app from '@adonisjs/core/services/app'

export default class UniquePreparation extends BaseMail {
  contact: { id: number; first_name: string; last_name: string; email: string }
  from: string
  content: string
  subject: string

  constructor(
    content: string,
    subject: string,
    contact: { id: number; first_name: string; last_name: string; email: string }
  ) {
    super()
    this.from = env.get('SMTP_USERNAME')
    this.contact = contact
    this.content = content
    this.subject = subject
  }

  prepare() {
    // CORRECTION V-11 : Utilisation cohérente de 'url'
    const url = env.get('URL') || ''
    const imageFileRegex = /<img\s+file=([^>]+\.(jpg|png))\s*\/?>/g

    let htmlContent = this.content
      .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
      .replace(/\${URL}/g, url)
      .replace(/\${url}/g, url)

    const matches = htmlContent.match(imageFileRegex)

    if (matches) {
      for (const match of matches) {
        const pathMatch = match.match(/file=([^\s>]+)/)
        if (pathMatch) {
          const rawFilePath = pathMatch[1]

          // CORRECTION V-01 (Path Traversal / LFI) : Sécurité Absolue
          const baseUploadDir = path.resolve(app.makePath('uploads'))

          // On ne garde que le nom du fichier, on jette toute l'arborescence injectée
          const safeBaseName = path.basename(rawFilePath)
          const resolvedPath = path.resolve(baseUploadDir, safeBaseName)

          // Double vérification
          if (!resolvedPath.startsWith(baseUploadDir)) {
            console.error(`Alerte de sécurité LFI : tentative bloquée pour ${rawFilePath}`)
            continue // On ignore l'image malveillante
          }

          const fileURL = pathToFileURL(resolvedPath).href
          const cid = `image-${Date.now()}`
          htmlContent = htmlContent.replace(
            match,
            match.replace(/file=([^\s>]+)/, `src="cid:${cid}"`)
          )
          this.message.attach(fileURLToPath(fileURL), {
            contentType: 'image/png',
            filename: safeBaseName,
            headers: { 'Content-ID': cid },
          })
        }
      }
    }

    this.message
      .to(this.contact.email)
      .from(`Melomania <${this.from}>`)
      .subject(this.subject)
      .html(htmlContent)
  }
}