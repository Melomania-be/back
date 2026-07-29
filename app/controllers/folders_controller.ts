import Folder from '#models/folder'
import File from '#models/file'
import { folderCreationValidator, folderUpdateValidator } from '#validators/folder'
import { HttpContext } from '@adonisjs/core/http'

export default class FoldersController {
  async getAll(ctx: HttpContext) {
    const organizationId = ctx.auth.user?.organizationId

    return await Folder.query()
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .preload('files')
  }

  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(folderCreationValidator)
    const organizationId = ctx.auth.user?.organizationId

    return await Folder.create({ ...data, organizationId })
  }

  async update(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(folderUpdateValidator)
    const organizationId = ctx.auth.user?.organizationId

    let folder = await Folder.query()
      .where('id', data.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    folder.merge(data)
    await folder.save()

    let files = await File.findMany(data.files.map((file) => file.id))

    await folder.related('files').detach()
    await folder.related('files').attach(files.map((file) => file.id))

    return folder
  }

  async delete({ params, response, auth }: HttpContext) {
    const organizationId = auth.user?.organizationId

    let folder = await Folder.query()
      .where('id', params.id)
      .if(organizationId, (query) => query.where('organization_id', organizationId!))
      .firstOrFail()

    folder.delete()
    return response.send('folder deleted')
  }
}