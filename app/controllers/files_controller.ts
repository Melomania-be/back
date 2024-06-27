// import type { HttpContext } from '@adonisjs/core/http'

import { filesUploadValidator } from '#validators/file'
import { cuid } from '@adonisjs/core/helpers'
import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import File from '#models/file'
import fs from 'node:fs/promises'

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

  async delete({ params, response }: HttpContext) {
    let file = await File.findOrFail(params.id)
    const path = file.path

    try {
      await fs.unlink(path)
      file.delete()
      return response.send('file deleted')
    } catch (error) {
      // Handle error
      return response.badRequest('file not found')
    }
  }

  async download(ctx: HttpContext) {
    const file = await File.findOrFail(ctx.params.id)
    const path = file.path
    return ctx.response.download(path)
  }
}
