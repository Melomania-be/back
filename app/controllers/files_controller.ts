import { filesUploadValidator, filesUpdateValidator } from '#validators/file'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import File from '#models/file'
import fs from 'node:fs/promises'
import { createReadStream, statSync } from 'node:fs'
import { extname } from 'node:path'

export default class FilesController {

  async upload({ request, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const { file, files } = await request.validateUsing(filesUploadValidator)
    const createdFiles = []

    if (files) {
      for (const fileElement of files) {
        await fileElement.move(app.makePath('uploads'), { name: `${cuid()}.${fileElement.extname}` })
        createdFiles.push(await File.create({ name: fileElement.clientName, type: fileElement.type, content: '', path: fileElement.filePath, size: fileElement.size || 0 }))
      }
    }

    if (file) {
      await file.move(app.makePath('uploads'), { name: `${cuid()}.${file.extname}` })
      createdFiles.push(await File.create({ name: file.clientName, type: file.type, content: '', path: file.filePath, size: file.size || 0 }))
    }

    return createdFiles
  }

  async getAll({ bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    return await File.all()
  }

  async update(ctx: HttpContext) {
    await (ctx.bouncer as any).authorize('adminRights')
    const { id } = ctx.params
    const data = await ctx.request.validateUsing(filesUpdateValidator)
    let file = await File.findOrFail(id)
    file.merge(data)
    await file.save()
    return file
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    let file = await File.findOrFail(params.id)
    try {
      await fs.unlink(file.path)
      await file.delete()
      return response.send('file deleted')
    } catch (error) {
      return response.badRequest('file not found')
    }
  }

  // Routes de Download et Stream restent inchangées et accessibles pour servir les fichiers aux composants
  async download(ctx: HttpContext) {
    try {
      const file = await File.findOrFail(ctx.params.id)
      if (!file.path) return ctx.response.status(404).json({ error: 'File path not found' })

      try {
        await fs.access(file.path)
      } catch (accessError) {
        return ctx.response.status(404).json({ error: 'Physical file not found' })
      }

      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      ctx.response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      ctx.response.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type')
      ctx.response.header('Content-Type', file.type || 'application/octet-stream')
      ctx.response.header('Content-Disposition', `attachment; filename="${file.name}"`)
      ctx.response.header('Cache-Control', 'no-cache')

      return ctx.response.download(file.path)
    } catch (error) {
      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      return ctx.response.status(500).json({ error: 'Download failed' })
    }
  }

  async stream({ params, request, response }: HttpContext) {
    try {
      const file = await File.findOrFail(params.id)
      if (!file.path) return response.status(404).json({ error: 'File path not found' })

      let stats
      try {
        await fs.access(file.path)
        stats = statSync(file.path)
      } catch (accessError) {
        return response.status(404).json({ error: 'Physical file not found' })
      }

      const fileSize = stats.size
      const range = request.header('range')
      const ext = extname(file.name).toLowerCase()

      const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', //...
      }
      const contentType = mimeTypes[ext] || file.type || 'application/octet-stream'

      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Range, Content-Type')
      response.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = Number.parseInt(parts[0] || '0', 10)
        const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1
        const chunksize = end - start + 1

        if (start >= fileSize || end >= fileSize || start > end) {
          response.status(416)
          response.header('Content-Range', `bytes */${fileSize}`)
          return response.send('Range Not Satisfiable')
        }

        response.status(206)
        response.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        response.header('Accept-Ranges', 'bytes')
        response.header('Content-Length', chunksize.toString())
        response.header('Content-Type', contentType)
        response.header('Cache-Control', 'public, max-age=3600')

        const stream = createReadStream(file.path, { start, end })
        stream.on('error', () => { if (!response.hasLazyBody) response.status(500).send('Stream error') })
        return response.stream(stream)
      } else {
        response.header('Content-Length', fileSize.toString())
        response.header('Content-Type', contentType)
        response.header('Accept-Ranges', 'bytes')
        response.header('Cache-Control', 'public, max-age=3600')
        response.header('X-Content-Type-Options', 'nosniff')

        const stream = createReadStream(file.path)
        stream.on('error', () => { if (!response.hasLazyBody) response.status(500).send('Stream error') })
        return response.stream(stream)
      }
    } catch (error) {
      return response.status(500).json({ error: 'File streaming failed' })
    }
  }

  async info({ params, response }: HttpContext) {
    try {
      const file = await File.findOrFail(params.id)
      let fileStats = null
      let fileExists = false

      if (file.path) {
        try {
          await fs.access(file.path)
          fileStats = statSync(file.path)
          fileExists = true
        } catch (error) {}
      }

      return response.ok({
        file: { id: file.id, name: file.name, type: file.type, size: file.size ?? 0 },
        physical_file: { exists: fileExists, size: fileStats?.size || null },
      })
    } catch (error) {
      return response.status(404).json({ error: 'File not found' })
    }
  }
}