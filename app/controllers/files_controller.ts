// app/controllers/files_controller.ts - Version complète avec streaming amélioré et size
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
          size: fileElement.size || 0, // ✅ Ajouter la taille
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
        size: file.size || 0, // ✅ Ajouter la taille
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

  // ✅ MÉTHODE DOWNLOAD AMÉLIORÉE AVEC DEBUG ET CORS
  async download(ctx: HttpContext) {
    try {
      const file = await File.findOrFail(ctx.params.id)
      console.log(`📥 Download request for file: ${file.name} (ID: ${ctx.params.id})`)
      console.log(`📁 File path: ${file.path}`)

      if (!file.path) {
        console.error('❌ File path is empty for file:', file.id)
        return ctx.response.status(404).json({
          error: 'File path not found',
          fileId: file.id,
          fileName: file.name
        })
      }

      // Vérifier que le fichier existe physiquement
      try {
        await fs.access(file.path)
        console.log('✅ File exists on disk:', file.path)
      } catch (accessError) {
        console.error('❌ File does not exist on disk:', file.path, accessError)
        return ctx.response.status(404).json({
          error: 'Physical file not found',
          path: file.path,
          fileName: file.name
        })
      }

      console.log(`✅ Sending download for: ${file.name}`)

      // ✅ HEADERS CORS POUR TÉLÉCHARGEMENT
      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      ctx.response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      ctx.response.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type')

      // Headers pour forcer le téléchargement
      ctx.response.header('Content-Type', file.type || 'application/octet-stream')
      ctx.response.header('Content-Disposition', `attachment; filename="${file.name}"`)
      ctx.response.header('Cache-Control', 'no-cache')

      return ctx.response.download(file.path, file.name)
    } catch (error) {
      console.error('❌ Download error:', error)

      // ✅ CORS HEADERS MÊME EN CAS D'ERREUR
      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')

      return ctx.response.status(500).json({
        error: 'Download failed',
        details: error.message,
        fileId: ctx.params.id
      })
    }
  }

  // ✅ MÉTHODE STREAM AMÉLIORÉE POUR LECTURE DIRECTE
  async stream({ params, request, response }: HttpContext) {
    try {
      const file = await File.findOrFail(params.id)
      const filePath = file.path

      console.log(`🎬 Streaming request for file: ${file.name} (ID: ${params.id})`)
      console.log(`📁 File path: ${filePath}`)
      console.log(`📋 File type: ${file.type}`)

      if (!filePath) {
        console.error('❌ File path is empty for file:', file.id)
        return response.status(404).json({
          error: 'File path not found',
          fileId: file.id,
          fileName: file.name
        })
      }

      // Vérifier que le fichier existe physiquement
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
          fileName: file.name
        })
      }

      const fileSize = stats.size
      const range = request.header('range')

      // ✅ DÉTECTION AMÉLIORÉE DU CONTENT-TYPE
      const ext = extname(file.name).toLowerCase()
      const mimeTypes = {
        // Vidéos
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

        // Audio
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.wma': 'audio/x-ms-wma',
        '.opus': 'audio/opus',
        '.oga': 'audio/ogg',

        // Images
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',

        // Documents
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript'
      }

      const contentType = mimeTypes[ext] || file.type || 'application/octet-stream'
      console.log(`🎵 Determined Content-Type: ${contentType}`)

      // ✅ HEADERS CORS ET CACHE OPTIMISÉS
      response.header('Access-Control-Allow-Origin', '*')
      response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      response.header('Access-Control-Allow-Headers', 'Range, Content-Type')
      response.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')

      // ✅ GESTION DES RANGE REQUESTS (CRUCIAL POUR VIDÉOS)
      if (range) {
        console.log(`📊 Range request detected: ${range}`)

        // Parser le header Range (format: "bytes=start-end")
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = (end - start) + 1

        // Validation des ranges
        if (start >= fileSize || end >= fileSize || start > end) {
          console.error(`❌ Invalid range: ${start}-${end} for file size ${fileSize}`)
          response.status(416)
          response.header('Content-Range', `bytes */${fileSize}`)
          return response.send('Range Not Satisfiable')
        }

        console.log(`✅ Serving range: ${start}-${end}/${fileSize} (${chunksize} bytes)`)

        // Headers pour partial content
        response.status(206)
        response.header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        response.header('Accept-Ranges', 'bytes')
        response.header('Content-Length', chunksize.toString())
        response.header('Content-Type', contentType)
        response.header('Cache-Control', 'public, max-age=3600')

        // Stream la portion demandée
        const stream = createReadStream(filePath, { start, end })

        // Gestion des erreurs de stream
        stream.on('error', (error) => {
          console.error('❌ Stream error:', error)
          if (!response.hasLazyBody) {
            response.status(500).send('Stream error')
          }
        })

        return response.stream(stream)
      } else {
        // ✅ STREAMING COMPLET SANS RANGE
        console.log(`📺 Serving complete file: ${fileSize} bytes`)

        response.header('Content-Length', fileSize.toString())
        response.header('Content-Type', contentType)
        response.header('Accept-Ranges', 'bytes')
        response.header('Cache-Control', 'public, max-age=3600')

        // Headers additionnels pour la compatibilité
        response.header('X-Content-Type-Options', 'nosniff')

        const stream = createReadStream(filePath)

        // Gestion des erreurs de stream
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
        details: error.message,
        fileId: params.id
      })
    }
  }

  // ✅ NOUVELLE MÉTHODE : Informations sur un fichier (debugging)
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
          size: file.size ?? 0, // ✅ Inclure la taille du modèle
          created_at: file.createdAt,
          updated_at: file.updatedAt
        },
        physical_file: {
          exists: fileExists,
          size: fileStats?.size || null,
          modified: fileStats?.mtime || null,
          accessible: fileExists
        },
        urls: {
          download: `/files/download/${file.id}`,
          stream: `/files/stream/${file.id}`,
          info: `/files/info/${file.id}`
        }
      })
    } catch (error) {
      return response.status(404).json({
        error: 'File not found',
        fileId: params.id,
      })
    }
  }
}
