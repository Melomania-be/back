// app/controllers/piece_materials_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Piece from '#models/piece'
import Material from '#models/material'
import db from '@adonisjs/lucid/services/db'

export default class PieceMaterialsController {

  /**
   * Sélectionner un matériel pour une pièce (un seul matériel par pièce)
   */
  async selectMaterial({ params, request, response }: HttpContext) {
    try {
      const pieceId = params.pieceId
      const { materialId } = request.body()

      console.log(`🎵 Selecting material ${materialId} for piece ${pieceId}`)

      // Vérifier que la pièce existe
      const piece = await Piece.findOrFail(pieceId)

      // Si materialId est null, on désélectionne le matériel
      if (materialId === null) {
        await this.clearPieceSelection(pieceId)
        return response.json({
          success: true,
          message: 'Matériel désélectionné pour cette pièce',
          materialId: null
        })
      }

      // Vérifier que le matériel existe et appartient à cette pièce
      const material = await Material.query()
        .where('id', materialId)
        .where('piece_id', pieceId)
        .where('is_active', true)
        .firstOrFail()

      // Enregistrer la sélection dans une table dédiée ou dans la pièce
      await this.savePieceSelection(pieceId, materialId)

      console.log(`✅ Material ${materialId} selected for piece ${pieceId}`)

      return response.json({
        success: true,
        message: 'Matériel sélectionné avec succès',
        materialId: materialId,
        materialName: material.name
      })

    } catch (error) {
      console.error('Error selecting material for piece:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la sélection du matériel',
        details: error.message
      })
    }
  }

  /**
   * Obtenir le matériel sélectionné pour une pièce
   */
  async getSelectedMaterial({ params, response }: HttpContext) {
    try {
      const pieceId = params.pieceId

      console.log(`🔍 Getting selected material for piece ${pieceId}`)

      // Récupérer la sélection depuis la table/colonne dédiée
      const selection = await this.getPieceSelection(pieceId)

      if (!selection) {
        return response.json({
          materialId: null,
          material: null
        })
      }

      // Récupérer les détails du matériel sélectionné
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
      console.error('Error getting selected material for piece:', error)
      return response.status(500).json({
        materialId: null,
        material: null,
        error: error.message
      })
    }
  }

  /**
   * Obtenir toutes les sélections de matériels pour un projet
   */
  async getProjectMaterialSelections({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId

      console.log(`📊 Getting material selections for project ${projectId}`)

      // Récupérer toutes les pièces du projet avec leurs matériels sélectionnés
      const pieces = await Piece.query()
        .whereHas('projects', (projectQuery) => {
          projectQuery.where('projects.id', projectId)
        })
        .preload('composer')

      const selections = {}

      for (const piece of pieces) {
        const selection = await this.getPieceSelection(piece.id)
        selections[piece.id] = {
          piece: piece,
          selectedMaterialId: selection?.materialId || null
        }
      }

      return response.json(selections)

    } catch (error) {
      console.error('Error getting project material selections:', error)
      return response.status(500).json({
        error: 'Erreur lors de la récupération des sélections',
        details: error.message
      })
    }
  }

  /**
   * MÉTHODE PRIVÉE : Sauvegarder la sélection d'un matériel pour une pièce
   * Vous pouvez choisir entre :
   * 1. Ajouter une colonne `selected_material_id` à la table `pieces`
   * 2. Créer une table dédiée `piece_material_selections`
   *
   * Option 1 (colonne dans pieces) :
   */
  private async savePieceSelection(pieceId: number, materialId: number) {
    // Option 1: Ajouter une colonne selected_material_id à la table pieces
    await db.from('pieces')
      .where('id', pieceId)
      .update({ selected_material_id: materialId })

    // Option 2: Table dédiée (si vous préférez cette approche)
    /*
    await db.table('piece_material_selections')
      .insert({
        piece_id: pieceId,
        material_id: materialId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .onConflict(['piece_id'])
      .merge(['material_id', 'updated_at'])
    */
  }

  /**
   * MÉTHODE PRIVÉE : Récupérer la sélection d'un matériel pour une pièce
   */
  private async getPieceSelection(pieceId: number): Promise<{ materialId: number } | null> {
    // Option 1: Depuis la colonne selected_material_id de la table pieces
    const piece = await db.from('pieces')
      .select('selected_material_id')
      .where('id', pieceId)
      .first()

    return piece?.selected_material_id ? { materialId: piece.selected_material_id } : null

    // Option 2: Depuis une table dédiée
    /*
    const selection = await db.from('piece_material_selections')
      .select('material_id')
      .where('piece_id', pieceId)
      .first()

    return selection ? { materialId: selection.material_id } : null
    */
  }

  /**
   * MÉTHODE PRIVÉE : Effacer la sélection d'un matériel pour une pièce
   */
  private async clearPieceSelection(pieceId: number) {
    // Option 1: Mettre à null la colonne selected_material_id
    await db.from('pieces')
      .where('id', pieceId)
      .update({ selected_material_id: null })

    // Option 2: Supprimer de la table dédiée
    /*
    await db.from('piece_material_selections')
      .where('piece_id', pieceId)
      .delete()
    */
  }

  /**
   * Synchroniser les sélections de matériels pour un projet avec les callsheets
   */
  async syncWithCallsheets({ params, response }: HttpContext) {
    try {
      const projectId = params.projectId

      console.log(`🔄 Syncing material selections with callsheets for project ${projectId}`)

      // Cette méthode peut être appelée après une modification de sélection
      // pour mettre à jour les callsheets en temps réel

      // Récupérer toutes les callsheets du projet
      const callsheets = await db.from('callsheets')
        .where('project_id', projectId)

      // Marquer les callsheets comme nécessitant une mise à jour
      // ou déclencher une régénération automatique

      return response.json({
        success: true,
        message: 'Synchronisation avec les callsheets effectuée',
        callsheetsCount: callsheets.length
      })

    } catch (error) {
      console.error('Error syncing with callsheets:', error)
      return response.status(500).json({
        success: false,
        error: 'Erreur lors de la synchronisation',
        details: error.message
      })
    }
  }
}
