import env from '#start/env'
import { BaseMail } from '@adonisjs/mail'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export default class UniquePreparation extends BaseMail {
  contact: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
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
    const url = env.get('URL') || ''
    const imageFileRegex = /<img\s+file=([^>]+\.(jpg|png))\s*\/?>/g

    let htmlContent = this.content
      .replace(/\${NAME}/g, this.contact.first_name + ' ' + this.contact.last_name)
      .replace(/\${URL}/g, url)

    const matches = htmlContent.match(imageFileRegex)

    if (matches) {
      for (const match of matches) {
        const pathMatch = match.match(/file=([^\s>]+)/)
        if (pathMatch) {
          const filePath = pathMatch[1]
          const fileURL = pathToFileURL(filePath).href
          const cid = `image-${Date.now()}`
          htmlContent = htmlContent.replace(
            match,
            match.replace(/file=([^\s>]+)/, `src="cid:${cid}"`)
          )
          this.message.attach(fileURLToPath(fileURL), {
            contentType: 'image/png',
            filename: path.basename(filePath),
            headers: { 'Content-ID': cid },
          })
        }
      }
    }

    this.message
      .to(this.contact.email)
      .from(env.get('SMTP_USERNAME'))
      .subject(this.subject)
      .html(htmlContent)
  }
}
