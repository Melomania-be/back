import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import Project from '#models/project'
import Folder from '#models/folder'
import File from '#models/file'
import Piece from '#models/piece'
import { filesystemUploadValidator, createFolderValidator } from '#validators/filesystem'
import fs from 'node:fs/promises'

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

      // ✅ CORRECTION : Copier les fichiers existants ET créer les liens
      const existingScores = await File.query().where('piece_id', piece.id).whereNotNull('piece_id')

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

    return ctx.response.json({
      rootFolder: await rootFolder.load('children'),
      scoresFolder: await scoresFolder.load('children'),
      photosFolder,
      videosFolder,
      documentsFolder,
    })
  }

  // ✅ CORRECTION MAJEURE : Méthode getProjectStructure avec synchronisation automatique
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

    // ✅ AJOUT : Synchronisation automatique avant de retourner la structure
    await this.syncProjectFiles(projectId)

    // Recharger la structure après synchronisation
    const updatedRootFolder = await Folder.query()
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

    const processedRootFolder = addFileCounts(updatedRootFolder)

    const scoresFolder = processedRootFolder.children?.find((f: any) => f.name === 'Scores')
    const photosFolder = processedRootFolder.children?.find((f: any) => f.name === 'Photos')
    const videosFolder = processedRootFolder.children?.find((f: any) => f.name === 'Videos')
    const documentsFolder = processedRootFolder.children?.find((f: any) => f.name === 'Documents')
    const customFolders =
      processedRootFolder.children?.filter(
        (f: any) => !['Scores', 'Photos', 'Videos', 'Documents'].includes(f.name)
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

  // ✅ NOUVELLE MÉTHODE : Synchronisation des fichiers du projet
  private async syncProjectFiles(projectId: number) {
    try {
      console.log(`🔄 Synchronizing files for project ${projectId}`)

      // Obtenir tous les fichiers liés au projet dans la base
      const dbFiles = await File.query()
        .where('project_id', projectId)
        .whereNotNull('path')

      let deletedCount = 0
      let verifiedCount = 0

      for (const file of dbFiles) {
        try {
          // Vérifier si le fichier existe physiquement
          await fs.access(file.path)
          verifiedCount++
        } catch (error) {
          // Le fichier n'existe plus physiquement, le supprimer de la base
          console.log(`🗑️ Removing deleted file from database: ${file.name} (${file.path})`)
          await file.delete()
          deletedCount++
        }
      }

      console.log(`✅ Sync completed for project ${projectId}: ${verifiedCount} verified, ${deletedCount} removed`)
    } catch (error) {
      console.error(`❌ Error during file sync for project ${projectId}:`, error)
    }
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

    // ✅ AJOUT : Synchroniser les fichiers avant de retourner le contenu
    if (folder.project_id) {
      await this.syncProjectFiles(folder.project_id)
    }

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

  // Upload files avec détection automatique du piece_id
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

      // Déterminer automatiquement le piece_id si on est dans un dossier de pièce
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
            piece_id: pieceId || null,
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
          piece_id: pieceId || null,
          content: '',
        })

        console.log('Single file uploaded successfully:', dbFile.id, 'linked to piece:', pieceId)
        uploadedFiles.push(dbFile)
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

  // ✅ CORRECTION : Delete folder avec nettoyage physique
  async deleteFolder(ctx: HttpContext) {
    const folderId = ctx.params.id

    const folder = await Folder.findOrFail(folderId)

    if (folder.is_system_generated) {
      return ctx.response.badRequest({
        message: 'Cannot delete system-generated folders',
      })
    }

    // Supprimer récursivement tous les fichiers et dossiers
    await this.deleteFolderRecursive(folder)

    return ctx.response.noContent()
  }

  // ✅ NOUVELLE MÉTHODE : Suppression récursive avec nettoyage physique
  private async deleteFolderRecursive(folder: Folder) {
    // Obtenir tous les fichiers dans ce dossier
    const files = await File.query().where('folder_id', folder.id)

    // Supprimer physiquement et en base chaque fichier
    for (const file of files) {
      try {
        if (file.path) {
          await fs.unlink(file.path)
        }
      } catch (error) {
        console.warn(`Could not delete physical file: ${file.path}`, error)
      }
      await file.delete()
    }

    // Obtenir tous les sous-dossiers
    const subfolders = await Folder.query().where('parent_id', folder.id)

    // Supprimer récursivement chaque sous-dossier
    for (const subfolder of subfolders) {
      await this.deleteFolderRecursive(subfolder)
    }

    // Supprimer le dossier lui-même
    await folder.delete()
  }

  // ✅ CORRECTION : Delete file avec nettoyage physique
  async deleteFile(ctx: HttpContext) {
    const fileId = ctx.params.id

    const file = await File.findOrFail(fileId)

    try {
      // Supprimer le fichier physique
      if (file.path) {
        await fs.unlink(file.path)
        console.log(`🗑️ Physical file deleted: ${file.path}`)
      }
    } catch (error) {
      console.warn(`Could not delete physical file: ${file.path}`, error)
    }

    // Supprimer l'entrée en base
    await file.delete()

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

      return ctx.response.download(file.path)
    } catch (error) {
      console.error('Error getting piece score:', error)
      return ctx.response.status(500).json({ error: 'Failed to get score' })
    }
  }

  // ✅ CORRECTION : Sync piece folders avec nettoyage
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

    // Créer les dossiers manquants
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

        // Copier les partitions existantes
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

    // ✅ CORRECTION : Supprimer les dossiers orphelins
    const currentPieceIds = pieces.map((p) => p.id)
    const foldersToRemove = existingPieceFolders.filter(
      (f) => f.piece_id !== null && !currentPieceIds.includes(f.piece_id)
    )

    for (const folder of foldersToRemove) {
      await this.deleteFolderRecursive(folder)
    }

    // ✅ AJOUT : Synchroniser les fichiers après la synchronisation des dossiers
    await this.syncProjectFiles(projectId)

    return ctx.response.json({ message: 'Piece folders synced successfully' })
  }
}
