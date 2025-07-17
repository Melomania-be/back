import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import Project from '#models/project'
import Folder from '#models/folder'
import File from '#models/file'
import Piece from '#models/piece'
import { filesystemUploadValidator, createFolderValidator } from '#validators/filesystem'

export default class FilesystemController {
  // Initialize project file structure
  async initProjectStructure(ctx: HttpContext) {
    const projectId = ctx.params.id
    const project = await Project.findOrFail(projectId)

    // Check if structure already exists
    const existingRoot = await Folder.query()
      .where('project_id', projectId)
      .whereNull('parent_id')
      .first()

    if (existingRoot) {
      return this.getProjectStructure(ctx)
    }

    // Create root folder
    const rootFolder = await Folder.create({
      name: project.name,
      project_id: projectId,
      is_system_generated: true,
    })

    // Create default folders
    const scoresFolder = await Folder.create({
      name: 'Scores',
      parent_id: rootFolder.id,
      project_id: projectId,
      is_system_generated: true,
    })

    const photosFolder = await Folder.create({
      name: 'Photos',
      parent_id: rootFolder.id,
      project_id: projectId,
      is_system_generated: true,
    })

    const videosFolder = await Folder.create({
      name: 'Videos',
      parent_id: rootFolder.id,
      project_id: projectId,
      is_system_generated: true,
    })

    const documentsFolder = await Folder.create({
      name: 'Documents',
      parent_id: rootFolder.id,
      project_id: projectId,
      is_system_generated: true,
    })

    // Create folders for each piece in scores
    const pieces = await project.related('pieces').query()
    for (const piece of pieces) {
      const pieceFolder = await Folder.create({
        name: piece.name,
        parent_id: scoresFolder.id,
        project_id: projectId,
        piece_id: piece.id,
        is_system_generated: true,
      })

      // Check if piece has existing scores in other projects
      const existingScores = await File.query().where('piece_id', piece.id).whereNotNull('piece_id')

      // Copy existing scores to this project
      for (const score of existingScores) {
        await File.create({
          name: score.name,
          type: score.type,
          path: score.path,
          size: score.size,
          folder_id: pieceFolder.id,
          project_id: projectId,
          piece_id: piece.id,
        })
      }
    }

    return ctx.response.json({
      rootFolder: await rootFolder.load('children'),
      scoresFolder: await scoresFolder.load('children'),
      photosFolder,
      videosFolder,
      documentsFolder,
    })
  }

  // Get project file structure
  async getProjectStructure(ctx: HttpContext) {
    const projectId = ctx.params.id

    const rootFolder = await Folder.query()
      .where('project_id', projectId)
      .whereNull('parent_id')
      .preload('children', (query) => {
        query.preload('children', (subQuery) => {
          subQuery.preload('files')
          subQuery.preload('children', (subSubQuery) => {
            subSubQuery.preload('files')
          })
        })
        query.preload('files')
      })
      .first()

    if (!rootFolder) {
      return ctx.response.notFound({ message: 'Project structure not found' })
    }

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

      if (folder.files) {
        totalFiles += folder.files.length
      }

      return {
        ...folder.serialize(),
        children: processedChildren,
        files: folder.files || [],
        fileCount: totalFiles,
      }
    }

    const processedRootFolder = addFileCounts(rootFolder)

    const scoresFolder = processedRootFolder.children?.find((f) => f.name === 'Scores')
    const photosFolder = processedRootFolder.children?.find((f) => f.name === 'Photos')
    const videosFolder = processedRootFolder.children?.find((f) => f.name === 'Videos')
    const documentsFolder = processedRootFolder.children?.find((f) => f.name === 'Documents')
    const customFolders =
      processedRootFolder.children?.filter(
        (f) => !['Scores', 'Photos', 'Videos', 'Documents'].includes(f.name)
      ) || []

    return ctx.response.json({
      rootFolder: processedRootFolder,
      scoresFolder,
      photosFolder,
      videosFolder,
      documentsFolder,
      customFolders,
    })
  }

  // Create folder
  async createFolder(ctx: HttpContext) {
    try {
      const data = await ctx.request.validateUsing(createFolderValidator)

      console.log('Creating folder:', data)

      const folder = await Folder.create({
        name: data.name,
        parent_id: data.parentId || null,
        project_id: data.projectId || null,
        piece_id: data.pieceId || null,
        is_system_generated: false,
      })

      console.log('Folder created successfully:', folder.id)

      return ctx.response.json({
        success: true,
        folder: folder,
        message: 'Folder created successfully',
      })
    } catch (error) {
      console.error('Error creating folder:', error)

      if (error.messages) {
        return ctx.response.status(422).json({
          success: false,
          error: 'Validation failed',
          details: error.messages,
        })
      }

      return ctx.response.status(500).json({
        success: false,
        error: 'Failed to create folder',
        details: error.message,
      })
    }
  }

  // Get folder contents
  async getFolderContents(ctx: HttpContext) {
    const folderId = ctx.params.id

    const folder = await Folder.findOrFail(folderId)

    const subfolders = await Folder.query()
      .where('parent_id', folderId)
      .preload('files')
      .orderBy('name', 'asc')

    const files = await File.query().where('folder_id', folderId).orderBy('name', 'asc')

    const contents = [
      ...subfolders.map((f) => ({
        id: f.id,
        name: f.name,
        type: 'folder',
        size: null,
        mimeType: null,
        parentId: f.parent_id,
        projectId: f.project_id,
        pieceId: f.piece_id,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        children: f.files
          ? f.files.map((file) => ({
            id: file.id,
            name: file.name,
            type: 'file',
            size: file.size,
            mimeType: file.type,
            parentId: file.folder_id,
            projectId: file.project_id,
            pieceId: file.piece_id,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          }))
          : [],
        isSystemGenerated: f.is_system_generated,
      })),
      ...files.map((f) => ({
        id: f.id,
        name: f.name,
        type: 'file',
        size: f.size,
        mimeType: f.type,
        parentId: f.folder_id,
        projectId: f.project_id,
        pieceId: f.piece_id,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    ]

    return ctx.response.json(contents)
  }

  // ✅ CORRECTION MAJEURE : Upload files avec détection automatique du piece_id
  async uploadFiles(ctx: HttpContext) {
    try {
      const data = await ctx.request.validateUsing(filesystemUploadValidator)

      console.log('Upload request received:', {
        parentId: data.parentId,
        projectId: data.projectId,
        pieceId: data.pieceId,
        hasFiles: !!data.files,
        hasFile: !!data.file,
      })

      const uploadedFiles = []

      // ✅ AJOUT : Déterminer automatiquement le piece_id si on est dans un dossier de pièce
      let pieceId = data.pieceId
      let parentFolder = null

      if (data.parentId) {
        parentFolder = await Folder.find(data.parentId)
        if (parentFolder && parentFolder.piece_id) {
          pieceId = parentFolder.piece_id
          console.log('🎵 Detected piece folder, setting piece_id to:', pieceId)
        }
      }

      // Handle multiple files
      if (data.files) {
        for (const file of data.files) {
          console.log('Processing file:', file.clientName, file.type, file.size)

          const fileName = `${cuid()}.${file.extname}`

          await file.move(app.makePath('uploads'), {
            name: fileName,
          })

          const dbFile = await File.create({
            name: file.clientName,
            type: file.type,
            path: file.filePath,
            size: file.size || 0,
            folder_id: data.parentId || null,
            project_id: data.projectId || null,
            piece_id: pieceId || null, // ✅ CORRECTION : Utiliser pieceId détecté
            content: '',
          })

          console.log('File uploaded successfully:', dbFile.id, 'linked to piece:', pieceId)
          uploadedFiles.push(dbFile)
        }
      }

      // Handle single file
      if (data.file) {
        console.log('Processing single file:', data.file.clientName, data.file.type, data.file.size)

        const fileName = `${cuid()}.${data.file.extname}`

        await data.file.move(app.makePath('uploads'), {
          name: fileName,
        })

        const dbFile = await File.create({
          name: data.file.clientName,
          type: data.file.type,
          path: data.file.filePath,
          size: data.file.size || 0,
          folder_id: data.parentId || null,
          project_id: data.projectId || null,
          piece_id: pieceId || null, // ✅ CORRECTION : Utiliser pieceId détecté
          content: '',
        })

        console.log('Single file uploaded successfully:', dbFile.id, 'linked to piece:', pieceId)
        uploadedFiles.push(dbFile)
      }

      // ✅ AJOUT : Synchroniser avec l'ancienne relation folder->files si nécessaire
      for (const dbFile of uploadedFiles) {
        if (data.parentId) {
          try {
            await dbFile.related('folder_id').sync([data.parentId])
          } catch (error) {
            console.warn('Could not sync with old folder system:', error)
          }
        }
      }

      return ctx.response.json({
        success: true,
        files: uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
      })
    } catch (error) {
      console.error('Error uploading files:', error)

      if (error.messages) {
        return ctx.response.status(422).json({
          success: false,
          error: 'Validation failed',
          details: error.messages,
        })
      }

      return ctx.response.status(500).json({
        success: false,
        error: 'Upload failed',
        details: error.message,
      })
    }
  }

  // Get general files
  async getGeneralFiles(ctx: HttpContext) {
    try {
      const files = await File.query()
        .whereNull('project_id')
        .whereNull('folder_id')
        .orderBy('name', 'asc')

      const folders = await Folder.query()
        .whereNull('project_id')
        .whereNull('parent_id')
        .preload('files')
        .orderBy('name', 'asc')

      const items = [
        ...folders.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'folder',
          size: null,
          mimeType: null,
          parentId: f.parent_id,
          projectId: f.project_id,
          pieceId: f.piece_id,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          children: f.files
            ? f.files.map((file) => ({
              id: file.id,
              name: file.name,
              type: 'file',
              size: file.size,
              mimeType: file.type,
              parentId: file.folder_id,
              projectId: file.project_id,
              pieceId: file.piece_id,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
            }))
            : [],
        })),
        ...files.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'file',
          size: f.size,
          mimeType: f.type,
          parentId: f.folder_id,
          projectId: f.project_id,
          pieceId: f.piece_id,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
      ]

      return ctx.response.json(items)
    } catch (error) {
      console.error('Error in getGeneralFiles:', error)
      return ctx.response.json([])
    }
  }

  // Delete folder
  async deleteFolder(ctx: HttpContext) {
    const folderId = ctx.params.id

    const folder = await Folder.findOrFail(folderId)

    if (folder.is_system_generated) {
      return ctx.response.badRequest({
        message: 'Cannot delete system-generated folders',
      })
    }

    await File.query().where('folder_id', folderId).delete()

    const subfolders = await Folder.query().where('parent_id', folderId)
    for (const subfolder of subfolders) {
      await this.deleteFolder({ params: { id: subfolder.id } } as any)
    }

    await folder.delete()

    return ctx.response.noContent()
  }

  // Delete file
  async deleteFile(ctx: HttpContext) {
    const fileId = ctx.params.id

    const file = await File.findOrFail(fileId)

    try {
      await file.delete()
    } catch (error) {
      console.error('Error deleting file:', error)
    }

    return ctx.response.noContent()
  }

  // Rename folder
  async renameFolder(ctx: HttpContext) {
    const folderId = ctx.params.id
    const { name } = ctx.request.body()

    const folder = await Folder.findOrFail(folderId)

    if (folder.is_system_generated) {
      return ctx.response.badRequest({
        message: 'Cannot rename system-generated folders',
      })
    }

    folder.name = name
    await folder.save()

    return ctx.response.json(folder)
  }

  // Rename file
  async renameFile(ctx: HttpContext) {
    const fileId = ctx.params.id
    const { name } = ctx.request.body()

    const file = await File.findOrFail(fileId)
    file.name = name
    await file.save()

    return ctx.response.json(file)
  }

  // Get piece scores for callsheet
  async getPieceScores(ctx: HttpContext) {
    const pieceId = ctx.params.pieceId
    const fileName = ctx.params.fileName

    try {
      const file = await File.query().where('piece_id', pieceId).where('name', fileName).first()

      if (!file) {
        return ctx.response.notFound({ message: 'Score not found' })
      }

      return ctx.response.download(file.path, file.name)
    } catch (error) {
      console.error('Error getting piece score:', error)
      return ctx.response.status(500).json({ error: 'Failed to get score' })
    }
  }

  // Sync piece folders when pieces are added/removed from project
  async syncPieceFolders(ctx: HttpContext) {
    const projectId = ctx.params.id

    const project = await Project.findOrFail(projectId)
    const pieces = await project.related('pieces').query()

    const scoresFolder = await Folder.query()
      .where('project_id', projectId)
      .where('name', 'Scores')
      .first()

    if (!scoresFolder) {
      return ctx.response.badRequest({ message: 'Scores folder not found' })
    }

    const existingPieceFolders = await Folder.query()
      .where('parent_id', scoresFolder.id)
      .whereNotNull('piece_id')

    for (const piece of pieces) {
      const existingFolder = existingPieceFolders.find((f) => f.piece_id === piece.id)

      if (!existingFolder) {
        const pieceFolder = await Folder.create({
          name: piece.name,
          parent_id: scoresFolder.id,
          project_id: projectId,
          piece_id: piece.id,
          is_system_generated: true,
        })

        const existingScores = await File.query()
          .where('piece_id', piece.id)
          .whereNot('project_id', projectId)

        for (const score of existingScores) {
          await File.create({
            name: score.name,
            type: score.type,
            path: score.path,
            size: score.size,
            folder_id: pieceFolder.id,
            project_id: projectId,
            piece_id: piece.id,
            content: score.content,
          })
        }
      }
    }

    const currentPieceIds = pieces.map((p) => p.id)
    const foldersToRemove = existingPieceFolders.filter(
      (f) => !currentPieceIds.includes(f.piece_id)
    )

    for (const folder of foldersToRemove) {
      await folder.delete()
    }

    return ctx.response.json({ message: 'Piece folders synced successfully' })
  }
}
