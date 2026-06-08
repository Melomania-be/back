import { HttpContext } from '@adonisjs/core/http'
import Piece from '#models/piece'
import Material from '#models/material'
import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'
import db from '@adonisjs/lucid/services/db'

export default class PieceMaterialsController {

  async selectMaterial({ params, request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    try {
      const { materialId } = request.body()
      const piece = await Piece.findOrFail(params.pieceId)

      if (materialId === null) {
        await this.clearPieceSelection(piece.id)
        return response.status(200).json({ success: true, materialId: null })
      }

      const material = await Material.query().where('id', materialId).where('piece_id', piece.id).where('is_active', true).firstOrFail()
      await this.savePieceSelection(piece.id, material.id)
      return response.status(200).json({ success: true, materialId: material.id, materialName: material.name })
    } catch (error) { return response.status(500).json({ success: false, error: 'Erreur' }) }
  }

  async getSelectedMaterial({ params, response }: HttpContext) {
    // Lecture publique
    try {
      const selection = await this.getPieceSelection(params.pieceId)
      if (!selection) return response.status(200).json({ materialId: null, material: null })
      const material = await Material.query().where('id', selection.materialId).where('is_active', true).preload('files').first()
      return response.status(200).json({ materialId: selection.materialId, material: material ? material.serialize() : null })
    } catch (error) { return response.status(200).json({ materialId: null, material: null, error: error.message }) }
  }

  async syncWithCallsheets({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.id)
    await bouncer.with(ProjectPolicy).authorize('update', project)

    try {
      const projectPieces = await db.from('performed_ins').select('piece_id').where('project_id', project.id)
      let syncCount = 0
      for (const projectPiece of projectPieces) {
        const piece = await db.from('pieces').select('selected_material_id').where('id', projectPiece.piece_id).first()
        if (piece?.selected_material_id) {
          const updateResult = await db.from('performed_ins').where('project_id', project.id).where('piece_id', projectPiece.piece_id).update({ material_id: piece.selected_material_id, material_specified: true, updated_at: new Date() })
          if (Array.isArray(updateResult) ? updateResult.length > 0 : updateResult > 0) syncCount++
        }
      }
      return response.status(200).json({ success: true, syncedPieces: syncCount, totalPieces: projectPieces.length })
    } catch (error) { return response.status(500).json({ success: false, error: 'Erreur' }) }
  }

  async getProjectMaterialSelections({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.projectId)
    await bouncer.with(ProjectPolicy).authorize('view', project)

    try {
      const pieces = await Piece.query().whereHas('projects', (q) => q.where('projects.id', project.id)).preload('composer')
      const selections: Record<number, any> = {}
      for (const piece of pieces) {
        const selection = await this.getPieceSelection(piece.id)
        selections[piece.id] = { piece: piece.serialize(), selectedMaterialId: selection?.materialId || null }
      }
      return response.status(200).json(selections)
    } catch (error) { return response.status(500).json({ error: 'Erreur' }) }
  }

  // Fonctions privées internes...
  private async savePieceSelection(pieceId: number, materialId: number) { await db.from('pieces').where('id', pieceId).update({ selected_material_id: materialId, updated_at: new Date() }); await this.syncWithPerformedIns(pieceId, materialId) }
  private async getPieceSelection(pieceId: number): Promise<{ materialId: number } | null> { const piece = await db.from('pieces').select('selected_material_id').where('id', pieceId).first(); return piece?.selected_material_id ? { materialId: piece.selected_material_id } : null }
  private async clearPieceSelection(pieceId: number) { await db.from('pieces').where('id', pieceId).update({ selected_material_id: null, updated_at: new Date() }); await this.syncWithPerformedIns(pieceId, null) }
  private async syncWithPerformedIns(pieceId: number, materialId: number | null) {
    const projectPieces = await db.from('performed_ins').where('piece_id', pieceId)
    for (const p of projectPieces) { await db.from('performed_ins').where('project_id', p.project_id).where('piece_id', pieceId).update({ material_id: materialId, material_specified: materialId !== null, updated_at: new Date() }) }
  }
}
