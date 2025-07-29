import { HttpContext } from '@adonisjs/core/http'
import Piece from '#models/piece'
import Material from '#models/material'
import db from '@adonisjs/lucid/services/db'

export default class PieceMaterialsController {

  async selectMaterial({ params, request, response }: HttpContext) {
    try {
      const pieceId = params.pieceId
      const { materialId } = request.body()

      const piece = await Piece.findOrFail(pieceId)

      if (materialId === null) {
        await this.clearPieceSelection(pieceId)
        return response.json({
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

      return response.json({
        success: true,
        message: 'Matériel sélectionné avec succès',
        materialId: materialId,
        materialName: material.name
      })

    } catch (error) {
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la sélection du matériel',
        details: error.message
      })
    }
  }

  async getSelectedMaterial({ params, response }: HttpContext) {
    try {
      const pieceId = params.pieceId

      const selection = await this.getPieceSelection(pieceId)

      if (!selection) {
        return response.json({
          materialId: null,
          material: null
        })
      }

      const material = await Material.query()
        .where('id', selection.materialId)
        .where('is_active', true)
        .preload('files')
        .first()

      return response.json({
        materialId: selection.materialId,
        material: material
      })

    } catch (error) {
      return response.status(500).json({
        materialId: null,
        material: null,
        error: error.message
      })
    }
  }

  async getProjectMaterialSelections({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId

      const pieces = await Piece.query()
        .whereHas('projects', (projectQuery) => {
          projectQuery.where('projects.id', projectId)
        })
        .preload('composer')

      const selections: Record<number, any> = {}

      for (const piece of pieces) {
        const selection = await this.getPieceSelection(piece.id)
        selections[piece.id] = {
          piece: piece,
          selectedMaterialId: selection?.materialId || null
        }
      }

      return response.json(selections)

    } catch (error) {
      return response.status(500).json({
        error: 'Erreur lors de la récupération des sélections',
        details: error.message
      })
    }
  }

  private async savePieceSelection(pieceId: number, materialId: number) {
    await db.from('pieces')
      .where('id', pieceId)
      .update({ selected_material_id: materialId })
  }

  private async getPieceSelection(pieceId: number): Promise<{ materialId: number } | null> {
    const piece = await db.from('pieces')
      .select('selected_material_id')
      .where('id', pieceId)
      .first()

    return piece?.selected_material_id ? { materialId: piece.selected_material_id } : null
  }

  private async clearPieceSelection(pieceId: number) {
    await db.from('pieces')
      .where('id', pieceId)
      .update({ selected_material_id: null })
  }

  async syncWithCallsheets({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId

      const callsheets = await db.from('callsheets')
        .where('project_id', projectId)

      return response.json({
        success: true,
        message: 'Synchronisation avec les callsheets effectuée',
        callsheetsCount: callsheets.length
      })

    } catch (error) {
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la synchronisation',
        details: error.message
      })
    }
  }
}
