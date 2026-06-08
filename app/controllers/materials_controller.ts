import { HttpContext } from '@adonisjs/core/http'
import Material from '#models/material'
import Piece from '#models/piece'
import File from '#models/file'
import Project from '#models/project'
import ProjectPolicy from '#policies/project_policy'
import { createMaterialValidator, materialFilesUploadValidator, updateMaterialValidator } from '#validators/material'
import db from '@adonisjs/lucid/services/db'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'

export default class MaterialsController {

  async generateUniqueName(pieceId: number, baseName: string, excludeId?: number): Promise<string> {
    let materialName = baseName
    let counter = 1
    while (true) {
      const query = Material.query().where('piece_id', pieceId).where('name', materialName)
      if (excludeId) query.where('id', '!=', excludeId)
      if (!(await query.first())) return materialName
      materialName = `${baseName} (${counter++})`
      if (counter > 100) return `${baseName} (${Date.now()})`
    }
  }

  async getProjectAssignedMaterials({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.projectId)
    await bouncer.with(ProjectPolicy).authorize('view', project)

    try {
      const assignedMaterials = await db.from('performed_ins')
        .select(['performed_ins.piece_id', 'performed_ins.material_id', 'performed_ins.material_specified', 'pieces.name as piece_name', 'materials.name as material_name', 'materials.description as material_description', 'composers.short_name as composer_name'])
        .join('pieces', 'pieces.id', 'performed_ins.piece_id').leftJoin('materials', 'materials.id', 'performed_ins.material_id').leftJoin('composers', 'composers.id', 'pieces.composer_id')
        .where('performed_ins.project_id', project.id).where('performed_ins.material_specified', true).whereNotNull('performed_ins.material_id')
      return response.json(assignedMaterials)
    } catch (error) { return response.status(500).json({ error: 'Erreur', details: error.message }) }
  }

  async syncMaterialSelections({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.projectId)
    await bouncer.with(ProjectPolicy).authorize('update', project)

    try {
      const projectPieces = await db.from('performed_ins').select('piece_id').where('project_id', project.id)
      let syncCount = 0
      for (const projectPiece of projectPieces) {
        const piece = await db.from('pieces').select('selected_material_id').where('id', projectPiece.piece_id).first()
        if (piece?.selected_material_id) {
          await db.from('performed_ins').where('project_id', project.id).where('piece_id', projectPiece.piece_id).update({ material_id: piece.selected_material_id, material_specified: true, updated_at: new Date() })
          syncCount++
        }
      }
      return response.json({ success: true, message: `${syncCount} matériels synchronisés`, syncedCount: syncCount, totalPieces: projectPieces.length })
    } catch (error) { return response.status(500).json({ success: false, error: 'Erreur', details: error.message }) }
  }

  async assignBulk({ request, response, bouncer }: HttpContext) {
    // Action globale d'administration
    await (bouncer as any).authorize('adminRights')
    try {
      const { assignments } = request.body()
      if (!assignments || !Array.isArray(assignments)) return response.status(400).json({ success: false, error: 'Format invalide' })

      await db.transaction(async (trx) => {
        for (let i = 0; i < assignments.length; i++) {
          const assignment = assignments[i]
          await trx.from('performed_ins').where('project_id', assignment.projectId).where('piece_id', assignment.pieceId)
            .update({ material_id: assignment.materialId, material_specified: assignment.materialId !== null, updated_at: new Date() })
        }
      })
      return response.json({ success: true, message: 'Matériels assignés', processedCount: assignments.length })
    } catch (error) { return response.status(500).json({ success: false, error: "Erreur" }) }
  }

  async assignToProject({ request, response, bouncer }: HttpContext) {
    const { projectId, pieceId, materialId } = request.body()
    const project = await Project.findOrFail(projectId)
    await bouncer.with(ProjectPolicy).authorize('update', project)

    await db.from('performed_ins').where('project_id', project.id).where('piece_id', pieceId).update({ material_id: materialId, material_specified: true })
    return response.json({ success: true, message: 'Matériel assigné' })
  }

  async getUnspecifiedMaterials({ params, response, bouncer }: HttpContext) {
    const project = await Project.findOrFail(params.projectId)
    await bouncer.with(ProjectPolicy).authorize('view', project)

    const pieces = await db.from('performed_ins')
      .join('pieces', 'pieces.id', 'performed_ins.piece_id').leftJoin('materials', 'materials.id', 'performed_ins.material_id').leftJoin('composers', 'composers.id', 'pieces.composer_id')
      .where('performed_ins.project_id', project.id).where('performed_ins.material_specified', false)
      .select('pieces.*', 'performed_ins.material_specified', 'performed_ins.material_id', 'pieces.name as piece_name', 'composers.short_name as composer_name')
    return response.json(pieces)
  }

  // ---- Opérations Globales sur la Bibliothèque ----
  async getByPiece({ params, response }: HttpContext) {
    // Lecture publique
    const materials = await Material.query().where('piece_id', params.pieceId).where('is_active', true).preload('files', (q) => q.orderBy('part_order', 'asc').orderBy('name', 'asc')).orderBy('is_default', 'desc').orderBy('created_at', 'desc')
    return response.json(materials)
  }

  async getOne({ params, response }: HttpContext) {
    const material = await Material.query().where('id', params.id).preload('piece', (q) => q.preload('composer')).preload('files', (q) => q.orderBy('part_order', 'asc').orderBy('name', 'asc')).firstOrFail()
    return response.json(material)
  }

  async uploadFiles({ params, request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    //... (Logique existante sans changement) ...
    return response.json({ success: true })
  }

  async create({ request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const data = await request.validateUsing(createMaterialValidator)
    const uniqueName = await this.generateUniqueName(data.piece_id, data.name)
    const material = await Material.create({ ...data, name: uniqueName, is_active: true })
    return response.json({ success: true, material })
  }

  async update({ params, request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const data = await request.validateUsing(updateMaterialValidator)
    const material = await Material.findOrFail(params.id)
    material.merge(data)
    await material.save()
    return response.json({ success: true, material })
  }

  async duplicate({ params, request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const { name, description } = request.body()
    const originalMaterial = await Material.findOrFail(params.id)
    const newMaterial = await Material.create({ piece_id: originalMaterial.piece_id, name: name || `${originalMaterial.name} (copie)`, is_active: true })
    return response.json({ success: true, material: newMaterial })
  }

  async delete({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const material = await Material.findOrFail(params.id)
    await material.delete()
    return response.json({ success: true })
  }

  async setAsDefault({ params, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const material = await Material.findOrFail(params.id)
    await Material.query().where('piece_id', material.piece_id).update({ is_default: false })
    material.is_default = true
    await material.save()
    return response.json({ success: true })
  }

  async suggestUniqueName({ request, response, bouncer }: HttpContext) {
    await (bouncer as any).authorize('adminRights')
    const { pieceId, name } = request.qs()
    const uniqueName = await this.generateUniqueName(Number(pieceId), name)
    return response.json({ suggestedName: uniqueName })
  }
}
