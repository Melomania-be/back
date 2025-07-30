// app/controllers/shared_folder_controller.ts - VERSION CORRIGÉE
import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import SharedFolder from '#models/shared_folder'
import Folder from '#models/folder'
import File from '#models/file'
import { DateTime } from 'luxon'

export default class SharedFolderController {
  /**
   * Créer un lien de partage pour un dossier
   */
  async createShare(ctx: HttpContext) {
    try {
      const folderId = ctx.params.id

      // Vérifier que le dossier existe
      const folder = await Folder.findOrFail(folderId)

      // Vérifier si un partage existe déjà pour ce dossier
      let sharedFolder = await SharedFolder.query()
        .where('folder_id', folderId)
        .where('is_active', true)
        .first()

      if (sharedFolder) {
        // Retourner le partage existant
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

      // Créer un nouveau partage
      const token = cuid()
      sharedFolder = await SharedFolder.create({
        folder_id: folderId,
        token: token,
        view_count: 0,
        is_active: true,
        expires_at: null // Pas d'expiration par défaut
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
      console.error('Error creating share:', error)
      return ctx.response.status(500).json({
        success: false,
        error: 'Failed to create share link'
      })
    }
  }

  /**
   * ✅ CORRECTION : Accéder à un dossier partagé via token
   */
  async getSharedFolder(ctx: HttpContext) {
    try {
      const token = ctx.params.token
      console.log(`🔍 Loading shared folder with token: ${token}`)

      // Trouver le partage par token
      const sharedFolder = await SharedFolder.query()
        .where('token', token)
        .preload('folder')
        .first()

      if (!sharedFolder) {
        console.log('❌ Shared folder not found')
        return ctx.response.status(404).json({
          error: 'Shared folder not found'
        })
      }

      // Vérifier si le partage est encore valide
      if (!sharedFolder.isValid()) {
        console.log('❌ Share link expired or deactivated')
        return ctx.response.status(403).json({
          error: 'Share link has expired or been deactivated'
        })
      }

      console.log(`✅ Found shared folder: ${sharedFolder.folder.name} (ID: ${sharedFolder.folder.id})`)

      // ✅ CORRECTION : Charger les contenus du dossier correctement
      const folderContents = await this.loadFolderContentsRecursive(sharedFolder.folder.id)
      console.log(`📂 Loaded ${folderContents.length} items from folder`)

      // Incrémenter le compteur de vues
      await sharedFolder.incrementViews()

      // Préparer les données du dossier
      const folderData = {
        id: sharedFolder.folder.id,
        name: sharedFolder.folder.name,
        type: 'folder',
        projectId: sharedFolder.folder.project_id,
        pieceId: sharedFolder.folder.piece_id,
        createdAt: sharedFolder.folder.createdAt,
        updatedAt: sharedFolder.folder.updatedAt,
        children: folderContents
      }

      console.log(`✅ Returning folder data with ${folderContents.length} children`)

      return ctx.response.json({
        folder: folderData,
        shareInfo: {
          token: sharedFolder.token,
          viewCount: sharedFolder.view_count,
          createdAt: sharedFolder.createdAt,
          expiresAt: sharedFolder.expires_at
        }
      })

    } catch (error) {
      console.error('❌ Error getting shared folder:', error)
      return ctx.response.status(500).json({
        error: 'Failed to load shared folder'
      })
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Charger les contenus d'un dossier de manière récursive
   */
  private async loadFolderContentsRecursive(folderId: number): Promise<any[]> {
    try {
      console.log(`📁 Loading contents for folder ${folderId}`)

      // Charger les sous-dossiers
      const subfolders = await Folder.query()
        .where('parent_id', folderId)
        .orderBy('name', 'asc')

      console.log(`📂 Found ${subfolders.length} subfolders`)

      // Charger les fichiers
      const files = await File.query()
        .where('folder_id', folderId)
        .orderBy('name', 'asc')

      console.log(`📄 Found ${files.length} files`)

      const contents = []

      // Ajouter les sous-dossiers
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

      // Ajouter les fichiers
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

      console.log(`✅ Returning ${contents.length} total items`)
      return contents

    } catch (error) {
      console.error(`❌ Error loading folder contents for ${folderId}:`, error)
      return []
    }
  }

  /**
   * ✅ CORRECTION : Accéder à un sous-dossier d'un partage
   */
  async getSharedSubfolder(ctx: HttpContext) {
    try {
      const token = ctx.params.token
      const subfolderId = ctx.params.folderId

      console.log(`🔍 Loading shared subfolder ${subfolderId} with token: ${token}`)

      // Vérifier que le partage est valide
      const sharedFolder = await SharedFolder.query()
        .where('token', token)
        .preload('folder')
        .first()

      if (!sharedFolder || !sharedFolder.isValid()) {
        return ctx.response.status(404).json({
          error: 'Invalid or expired share'
        })
      }

      // Charger le sous-dossier
      const subfolder = await Folder.find(subfolderId)

      if (!subfolder) {
        return ctx.response.status(404).json({
          error: 'Subfolder not found'
        })
      }

      // Vérifier que le sous-dossier appartient bien au partage (sécurité)
      const isAuthorized = await this.isSubfolderAuthorized(sharedFolder.folder.id, subfolder.id)
      if (!isAuthorized) {
        return ctx.response.status(403).json({
          error: 'Access denied to this folder'
        })
      }

      // Charger les contenus du sous-dossier
      const folderContents = await this.loadFolderContentsRecursive(subfolder.id)

      const folderData = {
        id: subfolder.id,
        name: subfolder.name,
        type: 'folder',
        projectId: subfolder.project_id,
        pieceId: subfolder.piece_id,
        createdAt: subfolder.createdAt,
        updatedAt: subfolder.updatedAt,
        children: folderContents
      }

      return ctx.response.json(folderData)

    } catch (error) {
      console.error('❌ Error getting shared subfolder:', error)
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

      console.log(`📥 Download request for shared file ${fileId} with token: ${token}`)

      // Vérifier que le partage est valide
      const sharedFolder = await SharedFolder.query()
        .where('token', token)
        .preload('folder')
        .first()

      if (!sharedFolder || !sharedFolder.isValid()) {
        return ctx.response.status(404).json({
          error: 'Invalid or expired share'
        })
      }

      // Charger le fichier
      const file = await File.findOrFail(fileId)

      // Vérifier que le fichier appartient bien au partage (sécurité)
      const isAuthorized = await this.isFileAuthorized(sharedFolder.folder.id, file)
      if (!isAuthorized) {
        return ctx.response.status(403).json({
          error: 'Access denied to this file'
        })
      }

      // Télécharger le fichier
      if (!file.path) {
        return ctx.response.status(404).json({
          error: 'File not found on disk'
        })
      }

      console.log(`✅ Downloading shared file: ${file.name}`)

      // Headers CORS pour téléchargement
      ctx.response.header('Access-Control-Allow-Origin', '*')
      ctx.response.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      ctx.response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      ctx.response.header(
        'Access-Control-Expose-Headers',
        'Content-Disposition, Content-Length, Content-Type'
      )

      // Headers pour forcer le téléchargement
      ctx.response.header('Content-Type', file.type || 'application/octet-stream')
      ctx.response.header('Content-Disposition', `attachment; filename="${file.name}"`)
      ctx.response.header('Cache-Control', 'no-cache')

      return ctx.response.download(file.path, file.name)

    } catch (error) {
      console.error('❌ Error downloading shared file:', error)
      return ctx.response.status(500).json({
        error: 'Download failed'
      })
    }
  }

  /**
   * Envoyer un lien de partage par email
   */
  async sendShareEmail(ctx: HttpContext) {
    try {
      const { recipientEmail, folderName, shareUrl, message } = ctx.request.body()

      if (!recipientEmail || !shareUrl) {
        return ctx.response.status(400).json({
          error: 'Recipient email and share URL are required'
        })
      }

      // Ici vous pouvez intégrer votre service d'email
      // Pour l'exemple, on simule l'envoi
      console.log('📧 Sending share email:', {
        to: recipientEmail,
        subject: `Shared folder: ${folderName}`,
        content: `
          Hello,

          A folder has been shared with you: ${folderName}

          ${message ? `Message: ${message}` : ''}

          Access the folder here: ${shareUrl}

          Best regards
        `
      })

      return ctx.response.json({
        success: true,
        message: 'Email sent successfully'
      })

    } catch (error) {
      console.error('❌ Error sending share email:', error)
      return ctx.response.status(500).json({
        error: 'Failed to send email'
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
      console.error('❌ Error revoking share:', error)
      return ctx.response.status(500).json({
        error: 'Failed to revoke share'
      })
    }
  }

  /**
   * ✅ CORRECTION : Vérifier qu'un sous-dossier est autorisé dans le partage
   */
  private async isSubfolderAuthorized(rootFolderId: number, subfolderId: number): Promise<boolean> {
    try {
      const rootFolder = await Folder.find(rootFolderId)
      const subfolder = await Folder.find(subfolderId)

      if (!rootFolder || !subfolder) return false

      // Si même projet, autorisé
      if (rootFolder.project_id && rootFolder.project_id === subfolder.project_id) {
        return true
      }

      // Si pas de projet (fichiers généraux), vérifier la hiérarchie
      if (!rootFolder.project_id && !subfolder.project_id) {
        return await this.isInHierarchy(rootFolderId, subfolderId)
      }

      return false
    } catch (error) {
      console.error('❌ Error checking subfolder authorization:', error)
      return false
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Vérifier si un dossier est dans la hiérarchie d'un autre
   */
  private async isInHierarchy(rootFolderId: number, targetFolderId: number): Promise<boolean> {
    if (rootFolderId === targetFolderId) return true

    try {
      // Chercher récursivement dans la hiérarchie
      const childFolders = await Folder.query().where('parent_id', rootFolderId)

      for (const child of childFolders) {
        if (child.id === targetFolderId) return true
        if (await this.isInHierarchy(child.id, targetFolderId)) return true
      }

      return false
    } catch (error) {
      console.error('❌ Error checking hierarchy:', error)
      return false
    }
  }

  /**
   * ✅ CORRECTION : Vérifier qu'un fichier est autorisé dans le partage
   */
  private async isFileAuthorized(rootFolderId: number, file: any): Promise<boolean> {
    try {
      const rootFolder = await Folder.find(rootFolderId)
      if (!rootFolder) return false

      // Si même projet, autorisé
      if (rootFolder.project_id && rootFolder.project_id === file.project_id) {
        return true
      }

      // Si pas de projet (fichiers généraux), vérifier si le fichier est dans la hiérarchie
      if (!rootFolder.project_id && !file.project_id) {
        // Si le fichier est directement dans le dossier partagé
        if (file.folder_id === rootFolderId) {
          return true
        }

        // Vérifier si le dossier du fichier est dans la hiérarchie
        if (file.folder_id) {
          return await this.isInHierarchy(rootFolderId, file.folder_id)
        }
      }

      return false
    } catch (error) {
      console.error('❌ Error checking file authorization:', error)
      return false
    }
  }
}
