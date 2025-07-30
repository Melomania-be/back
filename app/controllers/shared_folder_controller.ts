// app/controllers/shared_folder_controller.ts - VERSION CORRIGÉE
import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import SharedFolder from '#models/shared_folder'
import Folder from '#models/folder'
import File from '#models/file'

export default class SharedFolderController {
  /**
   * Créer un lien de partage pour un dossier
   */
  async createShare(ctx: HttpContext) {
    try {
      const folderId = ctx.params.id

      const folder = await Folder.findOrFail(folderId)

      let sharedFolder = await SharedFolder.query()
        .where('folder_id', folderId)
        .where('is_active', true)
        .first()

      if (sharedFolder) {
        await sharedFolder.load('folder')
        return ctx.response.json({
          success: true,
          token: sharedFolder.token,
          shareUrl: `/shared/folders/${sharedFolder.token}`,
          createdAt: sharedFolder.createdAt,
          viewCount: sharedFolder.view_count,
          expiresAt: sharedFolder.expires_at
        })
      }

      const token = cuid()
      sharedFolder = await SharedFolder.create({
        folder_id: folderId,
        token: token,
        view_count: 0,
        is_active: true,
        expires_at: null
      })

      await sharedFolder.load('folder')

      return ctx.response.json({
        success: true,
        token: sharedFolder.token,
        shareUrl: `/shared/folders/${sharedFolder.token}`,
        createdAt: sharedFolder.createdAt,
        viewCount: sharedFolder.view_count,
        expiresAt: sharedFolder.expires_at
      })

    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        error: 'Failed to create share link'
      })
    }
  }

  /**
   * Accéder à un dossier partagé via token - CORRECTION: Afficher exactement le dossier partagé
   */
  async getSharedFolder(ctx: HttpContext) {
    try {
      const token = ctx.params.token

      const sharedFolder = await SharedFolder.query()
        .where('token', token)
        .preload('folder')
        .first()

      if (!sharedFolder) {
        return ctx.response.status(404).json({
          error: 'Shared folder not found'
        })
      }

      if (!sharedFolder.isValid()) {
        return ctx.response.status(403).json({
          error: 'Share link has expired or been deactivated'
        })
      }

      // CORRECTION: Charger le contenu du dossier exact qui a été partagé
      const folderContents = await this.loadFolderContentsRecursive(sharedFolder.folder.id)

      await sharedFolder.incrementViews()

      // CORRECTION: Retourner exactement le dossier qui a été partagé, pas son parent
      const folderData = {
        id: sharedFolder.folder.id,
        name: sharedFolder.folder.name,
        type: 'folder',
        projectId: sharedFolder.folder.project_id,
        pieceId: sharedFolder.folder.piece_id,
        createdAt: sharedFolder.folder.createdAt,
        updatedAt: sharedFolder.folder.updatedAt,
        children: folderContents,
        // CORRECTION: Marquer ce dossier comme étant le dossier racine du partage
        isSharedRoot: true
      }

      return ctx.response.json({
        folder: folderData,
        shareInfo: {
          token: sharedFolder.token,
          viewCount: sharedFolder.view_count,
          createdAt: sharedFolder.createdAt,
          expiresAt: sharedFolder.expires_at,
          // CORRECTION: Ajouter l'ID du dossier racine partagé
          sharedFolderId: sharedFolder.folder.id,
          sharedFolderName: sharedFolder.folder.name
        }
      })

    } catch (error) {
      return ctx.response.status(500).json({
        error: 'Failed to load shared folder'
      })
    }
  }

  /**
   * Charger les contenus d'un dossier de manière récursive
   */
  private async loadFolderContentsRecursive(folderId: number): Promise<any[]> {
    try {
      const subfolders = await Folder.query()
        .where('parent_id', folderId)
        .orderBy('name', 'asc')

      const files = await File.query()
        .where('folder_id', folderId)
        .orderBy('name', 'asc')

      const contents = []

      for (const subfolder of subfolders) {
        contents.push({
          id: subfolder.id,
          name: subfolder.name,
          type: 'folder',
          projectId: subfolder.project_id,
          pieceId: subfolder.piece_id,
          createdAt: subfolder.createdAt,
          updatedAt: subfolder.updatedAt
        })
      }

      for (const file of files) {
        contents.push({
          id: file.id,
          name: file.name,
          type: 'file',
          size: file.size,
          mimeType: file.type,
          projectId: file.project_id,
          pieceId: file.piece_id,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt
        })
      }

      return contents

    } catch (error) {
      return []
    }
  }

  /**
   * Accéder à un sous-dossier d'un partage - CORRECTION: Vérification améliorée
   */
  async getSharedSubfolder(ctx: HttpContext) {
    try {
      const token = ctx.params.token
      const subfolderId = ctx.params.folderId

      const sharedFolder = await SharedFolder.query()
        .where('token', token)
        .preload('folder')
        .first()

      if (!sharedFolder || !sharedFolder.isValid()) {
        return ctx.response.status(404).json({
          error: 'Invalid or expired share'
        })
      }

      const subfolder = await Folder.find(subfolderId)

      if (!subfolder) {
        return ctx.response.status(404).json({
          error: 'Subfolder not found'
        })
      }

      // CORRECTION: Vérifier que le sous-dossier est bien dans l'arborescence du dossier partagé
      const isAuthorized = await this.isSubfolderAuthorized(sharedFolder.folder.id, subfolder.id)
      if (!isAuthorized) {
        return ctx.response.status(403).json({
          error: 'Access denied to this folder'
        })
      }

      const folderContents = await this.loadFolderContentsRecursive(subfolder.id)

      const folderData = {
        id: subfolder.id,
        name: subfolder.name,
        type: 'folder',
        projectId: subfolder.project_id,
        pieceId: subfolder.piece_id,
        createdAt: subfolder.createdAt,
        updatedAt: subfolder.updatedAt,
        children: folderContents,
        // CORRECTION: Indiquer que ce n'est PAS le dossier racine du partage
        isSharedRoot: false,
        // CORRECTION: Ajouter des infos sur le dossier parent partagé
        sharedRootId: sharedFolder.folder.id,
        sharedRootName: sharedFolder.folder.name
      }

      return ctx.response.json(folderData)

    } catch (error) {
      return ctx.response.status(500).json({
        error: 'Failed to load subfolder'
      })
    }
  }

  /**
   * Télécharger un fichier d'un partage
   */
  async downloadSharedFile(ctx: HttpContext) {
    try {
      const token = ctx.params.token
      const fileId = ctx.params.fileId

      const sharedFolder = await SharedFolder.query()
        .where('token', token)
        .preload('folder')
        .first()

      if (!sharedFolder || !sharedFolder.isValid()) {
        return ctx.response.status(404).json({
          error: 'Invalid or expired share'
        })
      }

      const file = await File.findOrFail(fileId)

      const isAuthorized = await this.isFileAuthorized(sharedFolder.folder.id, file)
      if (!isAuthorized) {
        return ctx.response.status(403).json({
          error: 'Access denied to this file'
        })
      }

      if (!file.path) {
        return ctx.response.status(404).json({
          error: 'File not found on disk'
        })
      }

      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      ctx.response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      ctx.response.header(
        'Access-Control-Expose-Headers',
        'Content-Disposition, Content-Length, Content-Type'
      )

      ctx.response.header('Content-Type', file.type || 'application/octet-stream')
      ctx.response.header('Content-Disposition', `inline; filename="${file.name}"`)
      ctx.response.header('Cache-Control', 'public, max-age=3600')

      return ctx.response.download(file.path, file.name)

    } catch (error) {
      return ctx.response.status(500).json({
        error: 'Download failed'
      })
    }
  }

  /**
   * Révoquer un partage
   */
  async revokeShare(ctx: HttpContext) {
    try {
      const folderId = ctx.params.id

      const sharedFolder = await SharedFolder.query()
        .where('folder_id', folderId)
        .where('is_active', true)
        .first()

      if (!sharedFolder) {
        return ctx.response.status(404).json({
          error: 'No active share found for this folder'
        })
      }

      await sharedFolder.deactivate()

      return ctx.response.json({
        success: true,
        message: 'Share revoked successfully'
      })

    } catch (error) {
      return ctx.response.status(500).json({
        error: 'Failed to revoke share'
      })
    }
  }

  /**
   * CORRECTION: Vérifier qu'un sous-dossier est autorisé dans le partage
   */
  private async isSubfolderAuthorized(sharedRootFolderId: number, targetFolderId: number): Promise<boolean> {
    try {
      // Si c'est le même dossier, autorisé
      if (sharedRootFolderId === targetFolderId) {
        return true
      }

      // Vérifier si le dossier cible est un descendant du dossier partagé
      return await this.isDescendantOf(targetFolderId, sharedRootFolderId)
    } catch (error) {
      return false
    }
  }

  /**
   * CORRECTION: Vérifier si un dossier est descendant d'un autre
   */
  private async isDescendantOf(childFolderId: number, ancestorFolderId: number): Promise<boolean> {
    try {
      const childFolder = await Folder.find(childFolderId)

      if (!childFolder) {
        return false
      }

      // Si pas de parent, on a atteint la racine sans trouver l'ancêtre
      if (!childFolder.parent_id) {
        return false
      }

      // Si le parent est l'ancêtre recherché
      if (childFolder.parent_id === ancestorFolderId) {
        return true
      }

      // Vérifier récursivement avec le parent
      return await this.isDescendantOf(childFolder.parent_id, ancestorFolderId)
    } catch (error) {
      return false
    }
  }

  /**
   * CORRECTION: Vérifier qu'un fichier est autorisé dans le partage
   */
  private async isFileAuthorized(sharedRootFolderId: number, file: any): Promise<boolean> {
    try {
      // Si le fichier est directement dans le dossier partagé
      if (file.folder_id === sharedRootFolderId) {
        return true
      }

      // Si le fichier est dans un sous-dossier du dossier partagé
      if (file.folder_id) {
        return await this.isDescendantOf(file.folder_id, sharedRootFolderId)
      }

      return false
    } catch (error) {
      return false
    }
  }
}
