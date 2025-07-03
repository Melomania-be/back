// import type { HttpContext } from '@adonisjs/core/http'
import { filesUploadValidator, filesUpdateValidator } from '#validators/file'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import File from '#models/file'
import fs from 'node:fs/promises'
import { createReadStream, statSync } from 'node:fs'
import { extname } from 'node:path'

export default class FilesController {
  async upload({ request }: HttpContext) {
    const { file, files } = await request.validateUsing(filesUploadValidator)

    if (files) {
      for (const fileElement of files) {
        await fileElement.move(app.makePath('uploads'), {
          name: `${cuid()}.${fileElement.extname}`,
        })

        await File.create({
          name: fileElement.clientName,
          type: fileElement.type,
          content: '',
          path: fileElement.filePath,
        })
      }
    }

    if (file) {
      await file.move(app.makePath('uploads'), {
        name: `${cuid()}.${file.extname}`,
      })

      await File.create({
        name: file.clientName,
        type: file.type,
        content: '',
        path: file.filePath,
      })
    }

    return 'file uploaded'
  }

  async getAll() {
    return await File.all()
  }

  async update(ctx: HttpContext) {
    const { id } = ctx.params
    const data = await ctx.request.validateUsing(filesUpdateValidator)
    let file = await File.findOrFail(id)
    file.merge(data)
    await file.save()
    return file
  }

  async delete({ params, response }: HttpContext) {
    let file = await File.findOrFail(params.id)
    const path = file.path
    try {
      await fs.unlink(path)
      file.delete()
      return response.send('file deleted')
    } catch (error) {
      return response.badRequest('file not found')
    }
  }

  async download(ctx: HttpContext) {
    const file = await File.findOrFail(ctx.params.id)
    const path = file.path
    return ctx.response.download(path)
  }

  // NOUVELLE MÉTHODE : Streaming pour lecture directe
  async stream({ params, request, response }: HttpContext) {
    const file = await File.findOrFail(params.id)
    const filePath = file.path

    try {
      // Vérifier que le fichier existe
      const stats = statSync(filePath)
      const fileSize = stats.size
      const range = request.header('range')

      // Déterminer le Content-Type basé sur l'extension
      const ext = extname(file.name).toLowerCase()
      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac'
      }

      const contentType = mimeTypes[ext] || 'application/octet-stream'

      if (range) {
        // Support pour le streaming avec range requests (important pour les vidéos)
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = (end - start) + 1

        response.status(206)
        response.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        response.header('Accept-Ranges', 'bytes')
        response.header('Content-Length', chunksize.toString())
        response.header('Content-Type', contentType)

        const stream = createReadStream(filePath, { start, end })
        return response.stream(stream)
      } else {
        // Streaming simple sans range
        response.header('Content-Length', fileSize.toString())
        response.header('Content-Type', contentType)
        response.header('Accept-Ranges', 'bytes')

        const stream = createReadStream(filePath)
        return response.stream(stream)
      }
    } catch (error) {
      return response.notFound('File not found')
    }
  }
}
