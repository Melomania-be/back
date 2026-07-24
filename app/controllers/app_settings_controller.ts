import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import AppSettings from '#models/app_settings'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'

const IMAGE_EXTNAMES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']
const IMAGE_MAX_SIZE = '2mb'

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
}

export default class AppSettingsController {
  async getSettings({ response }: HttpContext) {
    const settings = await AppSettings.getOrCreate()
    return response.ok(settings.serialize())
  }

  async updateSettings({ request, response }: HttpContext) {
    const settings = await AppSettings.getOrCreate()

    const primaryColor = request.input('primary_color')
    if (primaryColor) {
      settings.primary_color = primaryColor
    }

    const logo = request.file('logo', { size: IMAGE_MAX_SIZE, extnames: IMAGE_EXTNAMES })
    if (logo) {
      if (settings.logo_path) {
        try {
          await fs.unlink(settings.logo_path)
        } catch {}
      }
      const uploadDir = app.makePath('uploads/app')
      await fs.mkdir(uploadDir, { recursive: true })
      await logo.move(uploadDir, { name: `${cuid()}.${logo.extname}` })
      settings.logo_path = logo.filePath!
      settings.logo_file_name = logo.clientName
    }

    const background = request.file('background_image', {
      size: IMAGE_MAX_SIZE,
      extnames: IMAGE_EXTNAMES,
    })
    if (background) {
      if (settings.background_image_path) {
        try {
          await fs.unlink(settings.background_image_path)
        } catch {}
      }
      const uploadDir = app.makePath('uploads/app')
      await fs.mkdir(uploadDir, { recursive: true })
      await background.move(uploadDir, { name: `${cuid()}.${background.extname}` })
      settings.background_image_path = background.filePath!
      settings.background_file_name = background.clientName
    }

    await settings.save()
    return response.ok(settings.serialize())
  }

  async removeLogo({ response }: HttpContext) {
    const settings = await AppSettings.getOrCreate()
    if (settings.logo_path) {
      try {
        await fs.unlink(settings.logo_path)
      } catch {}
      settings.logo_path = null
      settings.logo_file_name = null
      await settings.save()
    }
    return response.ok(settings.serialize())
  }

  async removeBackground({ response }: HttpContext) {
    const settings = await AppSettings.getOrCreate()
    if (settings.background_image_path) {
      try {
        await fs.unlink(settings.background_image_path)
      } catch {}
      settings.background_image_path = null
      settings.background_file_name = null
      await settings.save()
    }
    return response.ok(settings.serialize())
  }

  async getLogo({ response }: HttpContext) {
    const settings = await AppSettings.getOrCreate()
    if (!settings.logo_path) {
      return response.status(404).json({ error: 'No logo set' })
    }
    try {
      await fs.access(settings.logo_path)
    } catch {
      return response.status(404).json({ error: 'Logo file not found on disk' })
    }
    const ext = settings.logo_file_name?.split('.').pop()?.toLowerCase() || 'png'
    response.header('Content-Type', MIME_TYPES[ext] || 'image/png')
    response.header('Cache-Control', 'public, max-age=3600')
    return response.stream(createReadStream(settings.logo_path))
  }

  async getBackground({ response }: HttpContext) {
    const settings = await AppSettings.getOrCreate()
    if (!settings.background_image_path) {
      return response.status(404).json({ error: 'No background image set' })
    }
    try {
      await fs.access(settings.background_image_path)
    } catch {
      return response.status(404).json({ error: 'Background file not found on disk' })
    }
    const ext = settings.background_file_name?.split('.').pop()?.toLowerCase() || 'jpg'
    response.header('Content-Type', MIME_TYPES[ext] || 'image/jpeg')
    response.header('Cache-Control', 'public, max-age=3600')
    return response.stream(createReadStream(settings.background_image_path))
  }
}
