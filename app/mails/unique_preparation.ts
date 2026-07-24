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

    // ✅ CORRECTION V-09 : le contenu de l'email passe désormais par une
    // liste blanche de balises autorisées au lieu d'être injecté tel quel.
    // On commence par remplacer les variables, PUIS on traite les images
    // (qui ont une syntaxe propre à ce système, différente du HTML standard),
    // et seulement ensuite on neutralise tout le HTML qui n'est pas autorisé.

    let htmlContent = this.content
      .replace(/\${NAME}/g, this.escapeHtml(this.contact.first_name + ' ' + this.contact.last_name))
      .replace(/\${URL}/g, url)

    // ✅ CORRECTION V-01 (LFI) : répertoire racine autorisé pour les images jointes
    const BASE_DIR = path.resolve('/var/uploads')

    const matches = htmlContent.match(imageFileRegex)

    if (matches) {
      for (const match of matches) {
        const pathMatch = match.match(/file=([^\s>]+)/)
        if (pathMatch) {
          const filePath = pathMatch[1]

          // ✅ CORRECTION V-01 : résoudre le chemin réel et vérifier qu'il
          // reste strictement à l'intérieur du répertoire autorisé (anti path traversal)
          const resolvedPath = path.resolve(BASE_DIR, filePath)
          if (!resolvedPath.startsWith(BASE_DIR)) {
            // Chemin suspect (ex: ../../etc/passwd) : on retire la balise
            // entièrement au lieu de l'attacher.
            htmlContent = htmlContent.replace(match, '')
            continue
          }

          const fileURL = pathToFileURL(resolvedPath).href
          const cid = `image-${Date.now()}`
          htmlContent = htmlContent.replace(
            match,
            match.replace(/file=([^\s>]+)/, `src="cid:${cid}"`)
          )
          this.message.attach(fileURLToPath(fileURL), {
            contentType: 'image/png',
            filename: path.basename(resolvedPath),
            headers: { 'Content-ID': cid },
          })
        }
      }
    }

    // ✅ CORRECTION V-09 : neutraliser tout HTML dangereux dans le reste du
    // contenu (tout ce qui n'est pas une balise <img file=...> déjà traitée).
    // On autorise uniquement un sous-ensemble de balises de mise en forme inoffensives.
    htmlContent = this.sanitizeHtml(htmlContent)

    this.message
      .to(this.contact.email)
      .from(`Melomania <${env.get('SMTP_USERNAME')}>`)
      .subject(this.subject)
      .html(htmlContent)
  }

  /**
   * Échappe les caractères HTML dangereux d'une chaîne simple (ex: nom, prénom).
   * Utilisé pour les variables injectées dans le template (${NAME}, etc.)
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  /**
   * Neutralise les balises HTML dangereuses (script, iframe, form, event handlers)
   * tout en conservant les balises de mise en forme basiques autorisées
   * (p, br, b, strong, i, em, u, a[href], img[src/cid] déjà traités plus haut).
   */
  private sanitizeHtml(html: string): string {
    return html
      // Supprime entièrement les balises <script>...</script>
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      // Supprime entièrement les balises <iframe>...</iframe>
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
      // Supprime entièrement les balises <form>...</form>
      .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
      // Supprime les balises <object>, <embed>, <link>, <style>
      .replace(/<(object|embed|link|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(object|embed|link|style)\b[^>]*\/?>/gi, '')
      // Supprime tous les attributs d'événements inline (onclick, onerror, onload, etc.)
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      // Neutralise les URLs javascript: dans les href/src
      .replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"')
  }
}
