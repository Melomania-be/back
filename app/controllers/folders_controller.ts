// import type { HttpContext } from '@adonisjs/core/http'

import Folder from '#models/folder'
import File from '#models/file'
import { folderCreationValidator, folderUpdateValidator } from '#validators/folder'
import { HttpContext } from '@adonisjs/core/http'

export default class FoldersController {
  async getAll() {
    return await Folder.query().preload('files')
  }

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(folderCreationValidator)
    return await Folder.create(data)
  }

  async update(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(folderUpdateValidator)
    let folder = await Folder.findOrFail(data.id)

    folder.merge(data)
    await folder.save()

    let files = await File.findMany(data.files.map((file) => file.id))

    await folder.related('files').detach()
    await folder.related('files').attach(files.map((file) => file.id))

    return folder
  }

  async delete({ params, response }: HttpContext) {
    let folder = await Folder.findOrFail(params.id)
    folder.delete()
    return response.send('folder deleted')
  }
}
