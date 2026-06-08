import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import Project from '#models/project'
import Folder from '#models/folder'
import File from '#models/file'
import { filesystemUploadValidator, createFolderValidator } from '#validators/filesystem'
import ProjectPolicy from '#policies/project_policy'
import fs from 'node:fs/promises'

export default class FilesystemController {

  // Helper pour vérifier l'accès au projet
  private async getAuthorizedProject(bouncer: any, projectId: number | string, action: 'view' | 'update' | 'delete' = 'view') {
    const project = await Project.findOrFail(projectId)
    await bouncer.with(ProjectPolicy).authorize(action, project)
    return project
  }

  async initProjectStructure({ params, bouncer, response }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const projectId = project.id

    const existingRoot = await Folder.query().where('project_id', projectId).whereNull('parent_id').first()
    if (existingRoot) return this.getProjectStructure({ params, bouncer, response } as HttpContext)

    const rootFolder = await Folder.create({ name: project.name, project_id: projectId, is_system_generated: true })
    const scoresFolder = await Folder.create({ name: 'Scores', parent_id: rootFolder.id, project_id: projectId, is_system_generated: true })
    const photosFolder = await Folder.create({ name: 'Photos', parent_id: rootFolder.id, project_id: projectId, is_system_generated: true })
    const videosFolder = await Folder.create({ name: 'Videos', parent_id: rootFolder.id, project_id: projectId, is_system_generated: true })
    const documentsFolder = await Folder.create({ name: 'Documents', parent_id: rootFolder.id, project_id: projectId, is_system_generated: true })

    const pieces = await project.related('pieces').query()
    for (const piece of pieces) {
      const pieceFolder = await Folder.create({ name: piece.name, parent_id: scoresFolder.id, project_id: projectId, piece_id: piece.id, is_system_generated: true })
      const existingScores = await File.query().where('piece_id', piece.id).whereNotNull('piece_id')
      for (const score of existingScores) {
        await File.create({ name: score.name, type: score.type, path: score.path, size: score.size, folder_id: pieceFolder.id, project_id: projectId, piece_id: piece.id, content: score.content })
      }
    }

    return response.json({ rootFolder: await rootFolder.load('children'), scoresFolder: await scoresFolder.load('children'), photosFolder, videosFolder, documentsFolder })
  }

  async getProjectStructure({ params, bouncer, response }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'view')
    const projectId = project.id

    const rootFolder = await Folder.query().where('project_id', projectId).whereNull('parent_id')
      .preload('children', (q) => q.preload('children', (sq) => { sq.preload('files'); sq.preload('children', (ssq) => ssq.preload('files')) }).preload('files')).first()

    if (!rootFolder) return response.notFound({ message: 'Project structure not found' })

    await this.syncProjectFiles(projectId)

    const updatedRootFolder = await Folder.query().where('project_id', projectId).whereNull('parent_id')
      .preload('children', (q) => q.preload('children', (sq) => { sq.preload('files'); sq.preload('children', (ssq) => ssq.preload('files')) }).preload('files')).firstOrFail()

    function addFileCounts(folder: any): any {
      let totalFiles = 0
      const processedChildren = []
      if (folder.children) {
        for (const child of folder.children) {
          if (child.type === 'folder' || child.constructor.name === 'Folder') {
            const processedChild = addFileCounts(child)
            totalFiles += processedChild.fileCount || 0
            processedChildren.push(processedChild)
          } else {
            processedChildren.push(child)
          }
        }
      }
      if (folder.files) totalFiles += folder.files.length
      return { ...folder.serialize(), children: processedChildren, files: folder.files || [], fileCount: totalFiles }
    }

    const processedRootFolder = addFileCounts(updatedRootFolder)
    const scoresFolder = processedRootFolder.children?.find((f: any) => f.name === 'Scores')
    const photosFolder = processedRootFolder.children?.find((f: any) => f.name === 'Photos')
    const videosFolder = processedRootFolder.children?.find((f: any) => f.name === 'Videos')
    const documentsFolder = processedRootFolder.children?.find((f: any) => f.name === 'Documents')
    const customFolders = processedRootFolder.children?.filter((f: any) => !['Scores', 'Photos', 'Videos', 'Documents'].includes(f.name)) || []

    return response.json({ rootFolder: processedRootFolder, scoresFolder, photosFolder, videosFolder, documentsFolder, customFolders })
  }

  private async syncProjectFiles(projectId: number) {
    try {
      const dbFiles = await File.query().where('project_id', projectId).whereNotNull('path')
      for (const file of dbFiles) {
        try {
          await fs.access(file.path)
        } catch (error) {
          await file.delete()
        }
      }
    } catch (error) {}
  }

  async createFolder({ request, response, bouncer }: HttpContext) {
    const data = await request.validateUsing(createFolderValidator)
    if (data.projectId) await this.getAuthorizedProject(bouncer, data.projectId, 'update')
    else await (bouncer as any).authorize('adminRights')

    try {
      const folder = await Folder.create({ name: data.name, parent_id: data.parentId || null, project_id: data.projectId || null, piece_id: data.pieceId || null, is_system_generated: false })
      return response.json({ success: true, folder: folder, message: 'Folder created successfully' })
    } catch (error) {
      return response.status(500).json({ success: false, error: 'Failed to create folder' })
    }
  }

  async getFolderContents({ params, response, bouncer }: HttpContext) {
    const folder = await Folder.findOrFail(params.id)
    if (folder.project_id) {
      await this.getAuthorizedProject(bouncer, folder.project_id, 'view')
      await this.syncProjectFiles(folder.project_id)
    } else {
      await (bouncer as any).authorize('adminRights')
    }

    const subfolders = await Folder.query().where('parent_id', folder.id).preload('files').orderBy('name', 'asc')
    const files = await File.query().where('folder_id', folder.id).orderBy('name', 'asc')

    const contents = [
      ...subfolders.map((f) => ({
        id: f.id, name: f.name, type: 'folder', size: null, mimeType: null, parentId: f.parent_id, projectId: f.project_id, pieceId: f.piece_id, createdAt: f.createdAt, updatedAt: f.updatedAt,
        children: f.files ? f.files.map((file) => ({ id: file.id, name: file.name, type: 'file', size: file.size, mimeType: file.type, parentId: file.folder_id, projectId: file.project_id, pieceId: file.piece_id, createdAt: file.createdAt, updatedAt: file.updatedAt })) : [],
        isSystemGenerated: f.is_system_generated,
      })),
      ...files.map((f) => ({ id: f.id, name: f.name, type: 'file', size: f.size, mimeType: f.type, parentId: f.folder_id, projectId: f.project_id, pieceId: f.piece_id, createdAt: f.createdAt, updatedAt: f.updatedAt })),
    ]
    return response.json(contents)
  }

  async uploadFiles({ request, response, bouncer }: HttpContext) {
    try {
      const data = await request.validateUsing(filesystemUploadValidator)
      if (data.projectId) await this.getAuthorizedProject(bouncer, data.projectId, 'update')
      else await (bouncer as any).authorize('adminRights')

      const uploadedFiles = []
      let pieceId = data.pieceId
      let parentFolder = null

      if (data.parentId) {
        parentFolder = await Folder.find(data.parentId)
        if (parentFolder?.piece_id) pieceId = parentFolder.piece_id
      }

      if (data.files) {
        for (const file of data.files) {
          const fileName = `${cuid()}.${file.extname}`
          await file.move(app.makePath('uploads'), { name: fileName })
          uploadedFiles.push(await File.create({ name: file.clientName, type: file.type, path: file.filePath, size: file.size || 0, folder_id: data.parentId || null, project_id: data.projectId || null, piece_id: pieceId || null, content: '' }))
        }
      }

      if (data.file) {
        const fileName = `${cuid()}.${data.file.extname}`
        await data.file.move(app.makePath('uploads'), { name: fileName })
        uploadedFiles.push(await File.create({ name: data.file.clientName, type: data.file.type, path: data.file.filePath, size: data.file.size || 0, folder_id: data.parentId || null, project_id: data.projectId || null, piece_id: pieceId || null, content: '' }))
      }

      return response.json({ success: true, files: uploadedFiles, message: `${uploadedFiles.length} file(s) uploaded successfully` })
    } catch (error) {
      return response.status(500).json({ success: false, error: 'Upload failed', details: error.message })
    }
  }

  async getGeneralFiles({ response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    try {
      const files = await File.query().whereNull('project_id').whereNull('folder_id').orderBy('name', 'asc')
      const folders = await Folder.query().whereNull('project_id').whereNull('parent_id').preload('files').orderBy('name', 'asc')

      const items = [
        ...folders.map((f) => ({ id: f.id, name: f.name, type: 'folder', parentId: f.parent_id, projectId: f.project_id, pieceId: f.piece_id,
          children: f.files ? f.files.map((file) => ({ id: file.id, name: file.name, type: 'file', parentId: file.folder_id, projectId: file.project_id, pieceId: file.piece_id })) : []
        })),
        ...files.map((f) => ({ id: f.id, name: f.name, type: 'file', parentId: f.folder_id, projectId: f.project_id, pieceId: f.piece_id })),
      ]
      return response.json(items)
    } catch (error) {
      return response.json([])
    }
  }

  async deleteFolder({ params, response, bouncer }: HttpContext) {
    const folder = await Folder.findOrFail(params.id)
    if (folder.project_id) await this.getAuthorizedProject(bouncer, folder.project_id, 'delete')
    else await (bouncer as any).authorize('adminRights')

    if (folder.is_system_generated) return response.badRequest({ message: 'Cannot delete system-generated folders' })

    await this.deleteFolderRecursive(folder)
    return response.noContent()
  }

  private async deleteFolderRecursive(folder: Folder) {
    const files = await File.query().where('folder_id', folder.id)
    for (const file of files) {
      try { if (file.path) await fs.unlink(file.path) } catch (error) {}
      await file.delete()
    }
    const subfolders = await Folder.query().where('parent_id', folder.id)
    for (const subfolder of subfolders) {
      await this.deleteFolderRecursive(subfolder)
    }
    await folder.delete()
  }

  async checkFileDeletion({ params, response, bouncer }: HttpContext) {
    const file = await File.findOrFail(params.id)
    if (file.project_id) await this.getAuthorizedProject(bouncer, file.project_id, 'view')
    else await (bouncer as any).authorize('adminRights')

    return response.json({ file: { id: file.id, name: file.name, projectId: file.project_id, pieceId: file.piece_id, folderId: file.folder_id }, canDelete: true })
  }

  async deleteFile({ params, response, bouncer }: HttpContext) {
    const file = await File.findOrFail(params.id)
    if (file.project_id) await this.getAuthorizedProject(bouncer, file.project_id, 'delete')
    else await (bouncer as any).authorize('adminRights')

    try { if (file.path) await fs.unlink(file.path) } catch (error) {}
    await file.delete()
    return response.noContent()
  }

  async renameFolder({ params, request, response, bouncer }: HttpContext) {
    const folder = await Folder.findOrFail(params.id)
    if (folder.project_id) await this.getAuthorizedProject(bouncer, folder.project_id, 'update')
    else await (bouncer as any).authorize('adminRights')

    if (folder.is_system_generated) return response.badRequest({ message: 'Cannot rename system-generated folders' })

    folder.name = request.body().name
    await folder.save()
    return response.json(folder)
  }

  async renameFile({ params, request, response, bouncer }: HttpContext) {
    const file = await File.findOrFail(params.id)
    if (file.project_id) await this.getAuthorizedProject(bouncer, file.project_id, 'update')
    else await (bouncer as any).authorize('adminRights')

    file.name = request.body().name
    await file.save()
    return response.json(file)
  }

  async getPieceScores({ params, response, bouncer }: HttpContext) {
    // Lecture fichier. Généralement pas protégé par bouncer strict si lié au public, sinon :
    try {
      const file = await File.query().where('piece_id', params.pieceId).where('name', params.fileName).first()
      if (!file) return response.notFound({ message: 'Score not found' })
      if (file.project_id) await this.getAuthorizedProject(bouncer, file.project_id, 'view')

      return response.download(file.path)
    } catch (error) {
      return response.status(500).json({ error: 'Failed to get score' })
    }
  }

  async syncPieceFolders({ params, response, bouncer }: HttpContext) {
    const project = await this.getAuthorizedProject(bouncer, params.id, 'update')
    const projectId = project.id
    const pieces = await project.related('pieces').query()
    const scoresFolder = await Folder.query().where('project_id', projectId).where('name', 'Scores').first()

    if (!scoresFolder) return response.badRequest({ message: 'Scores folder not found' })

    const existingPieceFolders = await Folder.query().where('parent_id', scoresFolder.id).whereNotNull('piece_id')

    for (const piece of pieces) {
      const existingFolder = existingPieceFolders.find((f) => f.piece_id === piece.id)
      if (!existingFolder) {
        const pieceFolder = await Folder.create({ name: piece.name, parent_id: scoresFolder.id, project_id: projectId, piece_id: piece.id, is_system_generated: true })
        const existingScores = await File.query().where('piece_id', piece.id).whereNot('project_id', projectId)
        for (const score of existingScores) {
          await File.create({ name: score.name, type: score.type, path: score.path, size: score.size, folder_id: pieceFolder.id, project_id: projectId, piece_id: piece.id, content: score.content })
        }
      }
    }

    const foldersToRemove = existingPieceFolders.filter((f) => f.piece_id !== null && !pieces.map(p => p.id).includes(f.piece_id))
    for (const folder of foldersToRemove) await this.deleteFolderRecursive(folder)
    await this.syncProjectFiles(projectId)

    return response.json({ message: 'Piece folders synced successfully' })
  }
}