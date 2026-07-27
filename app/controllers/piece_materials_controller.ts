// app/controllers/piece_materials_controller.ts - VERSION CORRIGÉE POUR ERR_CONTENT_LENGTH_MISMATCH

import { HttpContext } from '@adonisjs/core/http'
import Piece from '#models/piece'
import Material from '#models/material'
import db from '@adonisjs/lucid/services/db'

export default class PieceMaterialsController {

  async selectMaterial({ params, request, response, auth }: HttpContext) {
    try {
      const pieceId = params.pieceId
      const { materialId } = request.body()
      const organizationId = auth.user?.organizationId

      console.log(`Backend: Selecting material ${materialId} for piece ${pieceId}`)

      const piece = await Piece.query()
        .where('id', pieceId)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .firstOrFail()

      if (materialId === null) {
        await this.clearPieceSelection(pieceId)
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

      await this.savePieceSelection(pieceId, materialId)
      await this.notifyMaterialSelectionChange(pieceId, materialId)

      console.log(`Backend: Material ${materialId} selected for piece ${pieceId}`)

      return response.status(200).json({
        success: true,
        message: 'Matériel sélectionné avec succès',
        materialId: materialId,
        materialName: material.name
      })

    } catch (error) {
      console.error('Backend: Error selecting material:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la sélection du matériel',
        details: error.message
      })
    }
  }

  async getSelectedMaterial({ params, response, auth }: HttpContext) {
    try {
      const pieceId = params.pieceId
      const organizationId = auth.user?.organizationId
      console.log(`Backend: Getting selected material for piece ${pieceId}`)

      await Piece.query()
        .where('id', pieceId)
        .if(organizationId, (query) => query.where('organization_id', organizationId!))
        .firstOrFail()

      const selection = await this.getPieceSelection(pieceId)

      if (!selection) {
        console.log(`Backend: No material selected for piece ${pieceId}`)
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

      console.log(`Backend: Found selected material ${selection.materialId} for piece ${pieceId}`)

      return response.status(200).json({
        materialId: selection.materialId,
        material: material ? material.serialize() : null
      })

    } catch (error) {
      console.error('Backend: Error getting selected material:', error)
      return response.status(200).json({
        materialId: null,
        material: null,
        error: error.message
      })
    }
  }

  async syncWithCallsheets({ params, response }: HttpContext) {
    try {
      const projectId = params.id;

      if (!projectId) {
        return response.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      const projectExists = await db.from('projects').where('id', projectId).first()
      if (!projectExists) {
        return response.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      const projectPieces = await db
        .from('performed_ins')
        .select('piece_id')
        .where('project_id', projectId)

      let syncCount = 0
      const errors = []

      for (const projectPiece of projectPieces) {
        try {
          const piece = await db
            .from('pieces')
            .select('selected_material_id')
            .where('id', projectPiece.piece_id)
            .first()

          if (piece?.selected_material_id) {
            const updateResult = await db
              .from('performed_ins')
              .where('project_id', projectId)
              .where('piece_id', projectPiece.piece_id)
              .update({
                material_id: piece.selected_material_id,
                material_specified: true,
                updated_at: new Date()
              })

            if (Array.isArray(updateResult) ? updateResult.length > 0 : updateResult > 0) {
              syncCount++
            }
          }
        } catch (pieceError) {
          errors.push(`Error syncing piece ${projectPiece.piece_id}: ${pieceError.message}`)
        }
      }

      return response.status(200).json({
        success: true,
        message: `Synchronisation effectuée: ${syncCount} pièces synchronisées`,
        syncedPieces: syncCount,
        totalPieces: projectPieces.length,
        errors: errors.length > 0 ? errors : undefined
      })

    } catch (error) {
      console.error('Error in syncWithCallsheets:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la synchronisation',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }

  async getProjectMaterialSelections({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId
      console.log(`Backend: Getting project material selections for ${projectId}`)

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

      console.log(`Backend: Found selections for ${Object.keys(selections).length} pieces`)

      return response.status(200).json(selections)

    } catch (error) {
      console.error('Backend: Error getting project selections:', error)
      return response.status(500).json({
        error: 'Erreur lors de la récupération des sélections',
        details: error.message
      })
    }
  }

  private async savePieceSelection(pieceId: number, materialId: number) {
    try {
      const result = await db.from('pieces')
        .where('id', pieceId)
        .update({
          selected_material_id: materialId,
          updated_at: new Date()
        })

      console.log(`Backend: Material ${materialId} saved for piece ${pieceId} (${result} rows affected)`)
      await this.syncWithPerformedIns(pieceId, materialId)

    } catch (error) {
      console.error('Backend: Error saving selection:', error)
      throw error
    }
  }

  private async getPieceSelection(pieceId: number): Promise<{ materialId: number } | null> {
    try {
      const piece = await db.from('pieces')
        .select('selected_material_id')
        .where('id', pieceId)
        .first()

      if (piece?.selected_material_id) {
        console.log(`Backend: Material ${piece.selected_material_id} found for piece ${pieceId}`)
        return { materialId: piece.selected_material_id }
      }

      console.log(`Backend: No material selected for piece ${pieceId}`)
      return null
    } catch (error) {
      console.error('Backend: Error getting selection:', error)
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

      console.log(`Backend: Selection cleared for piece ${pieceId} (${result} rows affected)`)
      await this.syncWithPerformedIns(pieceId, null)

    } catch (error) {
      console.error('Backend: Error clearing selection:', error)
      throw error
    }
  }

  private async syncWithPerformedIns(pieceId: number, materialId: number | null) {
    try {
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

      console.log(`Backend: Synchronized with ${projectPieces.length} projects`)
    } catch (error) {
      console.error('Backend: Error sync performed_ins:', error)
    }
  }

  private async notifyMaterialSelectionChange(pieceId: number, materialId: number | null) {
    try {
      console.log(`Backend: Material selection changed: piece ${pieceId} -> material ${materialId}`)
    } catch (error) {
      console.error('Backend: Error notification:', error)
    }
  }
}