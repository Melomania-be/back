// app/controllers/piece_materials_controller.ts - VERSION CORRIGÉE POUR ERR_CONTENT_LENGTH_MISMATCH

import { HttpContext } from '@adonisjs/core/http'
import Piece from '#models/piece'
import Material from '#models/material'
import db from '@adonisjs/lucid/services/db'

export default class PieceMaterialsController {

  async selectMaterial({ params, request, response }: HttpContext) {
    try {
      const pieceId = params.pieceId
      const { materialId } = request.body()

      console.log(`🎯 Backend: Selecting material ${materialId} for piece ${pieceId}`)

      const piece = await Piece.findOrFail(pieceId)

      if (materialId === null) {
        await this.clearPieceSelection(pieceId)

        // ✅ DISPATCH event pour synchronisation
        await this.notifyMaterialSelectionChange(pieceId, null)

        return response.status(200).json({
          success: true,
          message: 'Matériel désélectionné pour cette pièce',
          materialId: null
        })
      }

      const material = await Material.query()
        .where('id', materialId)
        .where('piece_id', pieceId)
        .where('is_active', true)
        .firstOrFail()

      // ✅ SAUVEGARDE PERSISTANTE dans la base de données
      await this.savePieceSelection(pieceId, materialId)

      // ✅ DISPATCH event pour synchronisation
      await this.notifyMaterialSelectionChange(pieceId, materialId)

      console.log(`✅ Backend: Material ${materialId} selected for piece ${pieceId}`)

      return response.status(200).json({
        success: true,
        message: 'Matériel sélectionné avec succès',
        materialId: materialId,
        materialName: material.name
      })

    } catch (error) {
      console.error('❌ Backend: Error selecting material:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la sélection du matériel',
        details: error.message
      })
    }
  }

  // ✅ CORRECTION CRITIQUE : Forcer la réponse JSON correcte
  async getSelectedMaterial({ params, response }: HttpContext) {
    try {
      const pieceId = params.pieceId
      console.log(`🔍 Backend: Getting selected material for piece ${pieceId}`)

      const selection = await this.getPieceSelection(pieceId)

      if (!selection) {
        console.log(`❌ Backend: No material selected for piece ${pieceId}`)
        // ✅ FORCER une réponse JSON valide
        return response.status(200).json({
          materialId: null,
          material: null
        })
      }

      const material = await Material.query()
        .where('id', selection.materialId)
        .where('is_active', true)
        .preload('files')
        .first()

      console.log(`✅ Backend: Found selected material ${selection.materialId} for piece ${pieceId}`)

      // ✅ FORCER une réponse JSON valide avec tous les champs requis
      return response.status(200).json({
        materialId: selection.materialId,
        material: material ? material.serialize() : null
      })

    } catch (error) {
      console.error('❌ Backend: Error getting selected material:', error)
      // ✅ TOUJOURS retourner un JSON valide, même en cas d'erreur
      return response.status(200).json({
        materialId: null,
        material: null,
        error: error.message
      })
    }
  }

  // ✅ CORRECTION : Gérer les erreurs de sync
  async syncWithCallsheets({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId
      console.log(`🔄 Backend: Syncing material selections for project ${projectId}`)

      // Vérifier que le projet existe
      const projectExists = await db.from('projects').where('id', projectId).first()
      if (!projectExists) {
        return response.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      // ✅ NOUVEAU : Synchroniser les sélections avec les callsheets
      const pieces = await Piece.query()
        .whereHas('projects', (projectQuery) => {
          projectQuery.where('projects.id', projectId)
        })

      let syncCount = 0
      const errors = []

      for (const piece of pieces) {
        try {
          const selection = await this.getPieceSelection(piece.id)

          if (selection?.materialId) {
            // Vérifier que la relation performed_ins existe
            const performedIn = await db.from('performed_ins')
              .where('project_id', projectId)
              .where('piece_id', piece.id)
              .first()

            if (performedIn) {
              // Mettre à jour performed_ins
              await db.from('performed_ins')
                .where('project_id', projectId)
                .where('piece_id', piece.id)
                .update({
                  material_id: selection.materialId,
                  material_specified: true,
                  updated_at: new Date()
                })

              syncCount++
              console.log(`✅ Synced material ${selection.materialId} for piece ${piece.id}`)
            } else {
              errors.push(`Piece ${piece.id} not found in project ${projectId}`)
            }
          }
        } catch (pieceError) {
          console.error(`❌ Error syncing piece ${piece.id}:`, pieceError)
          errors.push(`Error syncing piece ${piece.id}: ${pieceError.message}`)
        }
      }

      console.log(`✅ Backend: Synced ${syncCount} pieces, ${errors.length} errors`)

      return response.status(200).json({
        success: true,
        message: 'Synchronisation avec les callsheets effectuée',
        syncedPieces: syncCount,
        totalPieces: pieces.length,
        errors: errors
      })

    } catch (error) {
      console.error('❌ Backend: Error in sync:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la synchronisation',
        details: error.message
      })
    }
  }

  async getProjectMaterialSelections({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId
      console.log(`🔍 Backend: Getting project material selections for ${projectId}`)

      const pieces = await Piece.query()
        .whereHas('projects', (projectQuery) => {
          projectQuery.where('projects.id', projectId)
        })
        .preload('composer')

      const selections: Record<number, any> = {}

      for (const piece of pieces) {
        const selection = await this.getPieceSelection(piece.id)
        selections[piece.id] = {
          piece: piece.serialize(),
          selectedMaterialId: selection?.materialId || null
        }
      }

      console.log(`✅ Backend: Found selections for ${Object.keys(selections).length} pieces`)

      return response.status(200).json(selections)

    } catch (error) {
      console.error('❌ Backend: Error getting project selections:', error)
      return response.status(500).json({
        error: 'Erreur lors de la récupération des sélections',
        details: error.message
      })
    }
  }

  // ✅ CORRECTION : Sauvegarder VRAIMENT dans la base de données
  private async savePieceSelection(pieceId: number, materialId: number) {
    try {
      // Méthode 1 : Sauvegarder dans la table pieces
      const result = await db.from('pieces')
        .where('id', pieceId)
        .update({
          selected_material_id: materialId,
          updated_at: new Date()
        })

      console.log(`✅ Backend: Material ${materialId} saved for piece ${pieceId} (${result} rows affected)`)

      // ✅ NOUVEAU : Aussi sauvegarder dans performed_ins si dans un projet
      await this.syncWithPerformedIns(pieceId, materialId)

    } catch (error) {
      console.error('❌ Backend: Error saving selection:', error)
      throw error
    }
  }

  // ✅ CORRECTION : Récupérer VRAIMENT depuis la base de données
  private async getPieceSelection(pieceId: number): Promise<{ materialId: number } | null> {
    try {
      const piece = await db.from('pieces')
        .select('selected_material_id')
        .where('id', pieceId)
        .first()

      if (piece?.selected_material_id) {
        console.log(`✅ Backend: Material ${piece.selected_material_id} found for piece ${pieceId}`)
        return { materialId: piece.selected_material_id }
      }

      console.log(`⚠️ Backend: No material selected for piece ${pieceId}`)
      return null
    } catch (error) {
      console.error('❌ Backend: Error getting selection:', error)
      return null
    }
  }

  private async clearPieceSelection(pieceId: number) {
    try {
      const result = await db.from('pieces')
        .where('id', pieceId)
        .update({
          selected_material_id: null,
          updated_at: new Date()
        })

      console.log(`✅ Backend: Selection cleared for piece ${pieceId} (${result} rows affected)`)

      // ✅ NOUVEAU : Aussi nettoyer performed_ins
      await this.syncWithPerformedIns(pieceId, null)

    } catch (error) {
      console.error('❌ Backend: Error clearing selection:', error)
      throw error
    }
  }

  // ✅ NOUVEAU : Synchronisation avec performed_ins pour les projets
  private async syncWithPerformedIns(pieceId: number, materialId: number | null) {
    try {
      // Trouver tous les projets qui utilisent cette pièce
      const projectPieces = await db.from('performed_ins')
        .where('piece_id', pieceId)

      for (const projectPiece of projectPieces) {
        await db.from('performed_ins')
          .where('project_id', projectPiece.project_id)
          .where('piece_id', pieceId)
          .update({
            material_id: materialId,
            material_specified: materialId !== null,
            updated_at: new Date()
          })
      }

      console.log(`✅ Backend: Synchronized with ${projectPieces.length} projects`)
    } catch (error) {
      console.error('❌ Backend: Error sync performed_ins:', error)
    }
  }

  // ✅ NOUVEAU : Notifier les changements pour synchronisation
  private async notifyMaterialSelectionChange(pieceId: number, materialId: number | null) {
    try {
      // Ici vous pourriez implémenter WebSockets ou autres
      // Pour l'instant, juste logger
      console.log(`🔔 Backend: Material selection changed: piece ${pieceId} -> material ${materialId}`)

      // Optionnel : Invalider les caches
      // await this.invalidateRelatedCaches(pieceId)
    } catch (error) {
      console.error('❌ Backend: Error notification:', error)
    }
  }
}
