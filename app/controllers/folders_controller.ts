import Folder from '#models/folder'
import File from '#models/file'
import { folderCreationValidator, folderUpdateValidator } from '#validators/folder'
import { HttpContext } from '@adonisjs/core/http'

export default class FoldersController {

  async getAll({ bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    return await Folder.query().preload('files')
  }

  async create({ request, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const data = await request.validateUsing(folderCreationValidator)
    return await Folder.create(data)
  }

  async update({ request, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const data = await request.validateUsing(folderUpdateValidator)
    let folder = await Folder.findOrFail(data.id)

    folder.merge(data)
    await folder.save()

    let files = await File.findMany(data.files.map((file) => file.id))

    await folder.related('files').detach()
    await folder.related('files').attach(files.map((file) => file.id))

    return folder
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    let folder = await Folder.findOrFail(params.id)
    await folder.delete()
    return response.send('folder deleted')
  }
}
