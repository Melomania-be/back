import fs from 'node:fs'
import path from 'node:path'
import { HttpContext } from '@adonisjs/core/http'
import { fileURLToPath } from 'node:url'

export default class DefaultTemplatesController {
  async getDefaultTemplates() {
    let filename = fileURLToPath(import.meta.url)
    let dirname = path.dirname(filename)
    let templatesDir = path.join(dirname, '../mails/html_templates')

    let files = fs.readdirSync(templatesDir)
    let templates = []

    for (let file of files) {
      let filePath = path.join(templatesDir, file)
      let content = fs.readFileSync(filePath, 'utf-8')
      templates.push({ name: file, content: content })
    }

    return templates
  }
}
