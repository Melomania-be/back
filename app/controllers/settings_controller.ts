import type { HttpContext } from '@adonisjs/core/http'
import Save from '#models/save'
import { execSync } from 'node:child_process'

export default class SettingsController {
  
  // GET /settings — lire tous les réglages
  async index({ response }: HttpContext) {
    const settings = await Save.all()
    return response.ok(settings)
  }

  // POST /settings — sauvegarder un réglage
  async store({ request, response }: HttpContext) {
    const { variable, value } = request.only(['variable', 'value'])

    let setting = await Save.findBy('variable', variable)

    if (setting) {
      setting.value = value
      await setting.save()
    } else {
      setting = await Save.create({ variable, value })
    }

    return response.ok(setting)
  }

  // POST /settings/backup/now — déclencher un backup immédiat
  async backupNow({ response }: HttpContext) {
    try {
      execSync('node ace backup:database', { cwd: process.cwd() })
      return response.ok({ message: 'Backup sent successfully' })
    } catch (error) {
      return response.internalServerError({ message: 'Backup failed', error: error.message })
    }
  }
}