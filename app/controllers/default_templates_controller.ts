import fs from 'node:fs'
import path from 'node:path'
import { HttpContext } from '@adonisjs/core/http'
import { fileURLToPath } from 'node:url'

export default class DefaultTemplatesController {
  async getDefaultTemplates() {
    let filename = fileURLToPath(import.meta.url)
    let dirname = path.dirname(filename)
    let templatesDir = path.join(dirname, '../html_templates')

    let files = fs.readdirSync(templatesDir)
    let templates = []

    for (let file of files) {
      let filePath = path.join(templatesDir, file)
      let content = fs.readFileSync(filePath, 'utf-8')
      templates.push({ name: file, content: content })
    }

    return templates
  }

  async editDefaultTemplate({ request }: HttpContext) {
    let { name, content } = request.only(['name', 'content'])
    let filename = fileURLToPath(import.meta.url)
    let dirname = path.dirname(filename)
    let templatesDir = path.join(dirname, '../html_templates')
    let filePath = path.join(templatesDir, name)

    fs.writeFileSync(filePath, content)

    return { success: true }
  }
}
