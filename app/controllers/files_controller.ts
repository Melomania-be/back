// app/controllers/files_controller.ts - Version corrigée complète

import { filesUploadValidator, filesUpdateValidator } from '#validators/file'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import File from '#models/file'
import fs from 'node:fs/promises'
import { createReadStream, statSync } from 'node:fs'
import { extname } from 'node:path'

export default class FilesController {
  async upload({ request, auth }: HttpContext) {
    const { file, files } = await request.validateUsing(filesUploadValidator)
    const organizationId = auth.user?.organizationId

    const createdFiles = []

    if (files) {
      for (const fileElement of files) {
        await fileElement.move(app.makePath('uploads'), {
          name: `${cuid()}.${fileElement.extname}`,
        })

        const createdFile = await File.create({
          name: fileElement.clientName,
          type: fileElement.type,
          content: '',
          path: fileElement.filePath,
          size: fileElement.size || 0,
          organizationId,
        })

        createdFiles.push(createdFile)
      }
    }

    if (file) {
      await file.move(app.makePath('uploads'), {
        name: `${cuid()}.${file.extname}`,
      })

      const createdFile = await File.create({
        name: file.clientName,
        type: file.type,
        content: '',
        path: file.filePath,
        size: file.size || 0,
        organizationId,
      })

      createdFiles.push(createdFile)
    }

    return createdFiles
  }

  async getAll(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    return await File.query().if(organizationId, (query) =>
      query.where('organization_id', organizationId!)
    )
  }

  async update(ctx: HttpContext) {
    const { id } = ctx.params
    const data = await ctx.request.validateUsing(filesUpdateValidator)
    const organizationId = ctx.auth.user?.organizationId

    let file = await File.query()
      .where('id', id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    file.merge(data)
    await file.save()
    return file
  }

  async delete({ params, response, auth }: HttpContext) {
    const organizationId = auth.user?.organizationId

    let file = await File.query()
      .where('id', params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    const path = file.path
    try {
      await fs.unlink(path)
      file.delete()
      return response.send('file deleted')
    } catch (error) {
      return response.badRequest('file not found')
    }
  }

  // ✅ CORRECTION : Méthode download corrigée avec gestion d'erreurs améliorée
  async download(ctx: HttpContext) {
    try {
      const organizationId = ctx.auth.user?.organizationId

      const file = await File.query()
        .where('id', ctx.params.id)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .first()

      if (!file) {
        return ctx.response.status(404).json({
          error: 'File not found',
          fileId: ctx.params.id,
        })
      }

      console.log(`📥 Download request for file: ${file.name} (ID: ${ctx.params.id})`)
      console.log(`📁 File path: ${file.path}`)

      if (!file.path) {
        console.error('❌ File path is empty for file:', file.id)
        return ctx.response.status(404).json({
          error: 'File path not found',
          fileId: file.id,
          fileName: file.name,
        })
      }

      try {
        await fs.access(file.path)
        console.log('✅ File exists on disk:', file.path)
      } catch (accessError) {
        console.error('❌ File does not exist on disk:', file.path, accessError)
        return ctx.response.status(404).json({
          error: 'Physical file not found',
          path: file.path,
          fileName: file.name,
        })
      }

      console.log(`✅ Sending download for: ${file.name}`)

      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      ctx.response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      ctx.response.header(
        'Access-Control-Expose-Headers',
        'Content-Disposition, Content-Length, Content-Type'
      )

      ctx.response.header('Content-Type', file.type || 'application/octet-stream')
      ctx.response.header('Content-Disposition', `attachment; filename="${file.name}"`)
      ctx.response.header('Cache-Control', 'no-cache')

      return ctx.response.download(file.path)
    } catch (error) {
      console.error('❌ Download error:', error)

      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')

      return ctx.response.status(500).json({
        error: 'Download failed',
        details: (error as Error).message,
        fileId: ctx.params.id,
      })
    }
  }

  // ✅ CORRECTION : Méthode stream corrigée avec gestion des types
  async stream({ params, request, response, auth }: HttpContext) {
    try {
      const organizationId = auth.user?.organizationId

      const file = await File.query()
        .where('id', params.id)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .first()

      if (!file) {
        return response.status(404).json({
          error: 'File not found',
          fileId: params.id,
        })
      }

      const filePath = file.path

      console.log(`🎬 Streaming request for file: ${file.name} (ID: ${params.id})`)
      console.log(`📁 File path: ${filePath}`)
      console.log(`📋 File type: ${file.type}`)

      if (!filePath) {
        console.error('❌ File path is empty for file:', file.id)
        return response.status(404).json({
          error: 'File path not found',
          fileId: file.id,
          fileName: file.name,
        })
      }

      let stats
      try {
        await fs.access(filePath)
        stats = statSync(filePath)
        console.log(`✅ File exists on disk. Size: ${stats.size} bytes`)
      } catch (accessError) {
        console.error('❌ File does not exist on disk:', filePath, accessError)
        return response.status(404).json({
          error: 'Physical file not found',
          path: filePath,
          fileName: file.name,
        })
      }

      const fileSize = stats.size
      const range = request.header('range')

      const ext = extname(file.name).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.mkv': 'video/x-matroska',
        '.flv': 'video/x-flv',
        '.wmv': 'video/x-ms-wmv',
        '.m4v': 'video/mp4',
        '.3gp': 'video/3gpp',
        '.ogv': 'video/ogg',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.wma': 'audio/x-ms-wma',
        '.opus': 'audio/opus',
        '.oga': 'audio/ogg',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
      }

      const contentType = mimeTypes[ext] || file.type || 'application/octet-stream'
      console.log(`🎵 Determined Content-Type: ${contentType}`)

      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Range, Content-Type')
      response.header(
        'Access-Control-Expose-Headers',
        'Content-Range, Accept-Ranges, Content-Length'
      )

      if (range) {
        console.log(`📊 Range request detected: ${range}`)

        const parts = range.replace(/bytes=/, '').split('-')
        const start = Number.parseInt(parts[0] || '0', 10)
        const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1
        const chunksize = end - start + 1

        if (start >= fileSize || end >= fileSize || start > end) {
          console.error(`❌ Invalid range: ${start}-${end} for file size ${fileSize}`)
          response.status(416)
          response.header('Content-Range', `bytes */${fileSize}`)
          return response.send('Range Not Satisfiable')
        }

        console.log(`✅ Serving range: ${start}-${end}/${fileSize} (${chunksize} bytes)`)

        response.status(206)
        response.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        response.header('Accept-Ranges', 'bytes')
        response.header('Content-Length', chunksize.toString())
        response.header('Content-Type', contentType)
        response.header('Cache-Control', 'public, max-age=3600')

        const stream = createReadStream(filePath, { start, end })

        stream.on('error', (error) => {
          console.error('❌ Stream error:', error)
          if (!response.hasLazyBody) {
            response.status(500).send('Stream error')
          }
        })

        return response.stream(stream)
      } else {
        console.log(`📺 Serving complete file: ${fileSize} bytes`)

        response.header('Content-Length', fileSize.toString())
        response.header('Content-Type', contentType)
        response.header('Accept-Ranges', 'bytes')
        response.header('Cache-Control', 'public, max-age=3600')

        response.header('X-Content-Type-Options', 'nosniff')

        const stream = createReadStream(filePath)

        stream.on('error', (error) => {
          console.error('❌ Complete stream error:', error)
          if (!response.hasLazyBody) {
            response.status(500).send('Stream error')
          }
        })

        stream.on('open', () => {
          console.log(`✅ Stream opened for: ${file.name}`)
        })

        stream.on('end', () => {
          console.log(`✅ Stream completed for: ${file.name}`)
        })

        return response.stream(stream)
      }
    } catch (error) {
      console.error('❌ Streaming error:', error)
      return response.status(500).json({
        error: 'File streaming failed',
        details: (error as Error).message,
        fileId: params.id,
      })
    }
  }

  // Informations sur un fichier (debugging)
  async info({ params, response, auth }: HttpContext) {
    try {
      const organizationId = auth.user?.organizationId

      const file = await File.query()
        .where('id', params.id)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .firstOrFail()

      let fileStats = null
      let fileExists = false

      if (file.path) {
        try {
          await fs.access(file.path)
          fileStats = statSync(file.path)
          fileExists = true
        } catch (accessError) {
          console.log('File does not exist on disk:', file.path)
        }
      }

      return response.ok({
        file: {
          id: file.id,
          name: file.name,
          type: file.type,
          path: file.path,
          size: file.size ?? 0,
          created_at: file.createdAt,
          updated_at: file.updatedAt,
        },
        physical_file: {
          exists: fileExists,
          size: fileStats?.size || null,
          modified: fileStats?.mtime || null,
          accessible: fileExists,
        },
        urls: {
          download: `/files/download/${file.id}`,
          stream: `/files/stream/${file.id}`,
          info: `/files/info/${file.id}`,
        },
      })
    } catch (error) {
      return response.status(404).json({
        error: 'File not found',
        fileId: params.id,
      })
    }
  }
}
