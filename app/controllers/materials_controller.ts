// app/controllers/materials_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Material from '#models/material'
import Piece from '#models/piece'
import File from '#models/file'
import {
  createMaterialValidator,
  materialFilesUploadValidator,
  updateMaterialValidator,
} from '#validators/material'
import db from '@adonisjs/lucid/services/db'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'

export default class MaterialsController {
  // Obtenir tous les matériels d'une pièce
  async getByPiece(ctx: HttpContext) {
    const pieceId = ctx.params.pieceId

    const materials = await Material.query()
      .where('piece_id', pieceId)
      .where('is_active', true)
      .preload('files', (query) => {
        query.orderBy('part_order', 'asc').orderBy('name', 'asc')
      })
      .orderBy('is_default', 'desc')
      .orderBy('created_at', 'desc')

    return ctx.response.json(materials)
  }

  // Obtenir un matériel spécifique
  async getOne(ctx: HttpContext) {
    const materialId = ctx.params.id

    const material = await Material.query()
      .where('id', materialId)
      .preload('piece', (query) => {
        query.preload('composer')
      })
      .preload('files', (query) => {
        query.orderBy('part_order', 'asc').orderBy('name', 'asc')
      })
      .firstOrFail()

    return ctx.response.json(material)
  }

  async assignBulk(ctx: HttpContext) {
    const { assignments } = ctx.request.body()

    try {
      // Traiter chaque assignation
      for (const assignment of assignments) {
        await db
          .from('performed_ins')
          .where('project_id', assignment.projectId)
          .where('piece_id', assignment.pieceId)
          .update({
            material_id: assignment.materialId,
            material_specified: assignment.materialId !== null,
          })
      }

      // Mettre à jour les compteurs de projets pour tous les matériels affectés
      const materialIds = assignments.filter((a) => a.materialId).map((a) => a.materialId)

      for (const materialId of [...new Set(materialIds)]) {
        const material = await Material.find(materialId)
        if (material) {
          await material.updateProjectsCount()
        }
      }

      return ctx.response.json({
        success: true,
        message: 'Matériels assignés avec succès',
      })
    } catch (error) {
      console.error('Error in bulk assign:', error)
      return ctx.response.status(500).json({
        success: false,
        error: "Erreur lors de l'assignation des matériels",
      })
    }
  }

  // Upload de fichiers pour un matériel
  async uploadFiles(ctx: HttpContext) {
    const materialId = ctx.params.id

    try {
      const material = await Material.findOrFail(materialId)
      const { files } = await ctx.request.validateUsing(materialFilesUploadValidator)

      if (!files || files.length === 0) {
        return ctx.response.badRequest({
          success: false,
          error: 'Aucun fichier fourni',
        })
      }

      const uploadedFiles = []

      for (const file of files) {
        const fileName = `${cuid()}.${file.extname}`

        await file.move(app.makePath('uploads'), {
          name: fileName,
        })

        const dbFile = await File.create({
          name: file.clientName,
          type: file.type,
          path: file.filePath,
          size: file.size || 0,
          material_id: material.id,
          piece_id: material.piece_id,
          content: '',
        })

        uploadedFiles.push(dbFile)
      }

      // Mettre à jour le compteur de fichiers
      await material.updateFilesCount()

      return ctx.response.json({
        success: true,
        files: uploadedFiles,
        message: `${uploadedFiles.length} fichier(s) ajouté(s) au matériel`,
      })
    } catch (error) {
      console.error('Error uploading files to material:', error)
      return ctx.response.status(500).json({
        success: false,
        error: "Erreur lors de l'upload des fichiers",
      })
    }
  }

  // Créer un nouveau matériel
  async create(ctx: HttpContext) {
    const data = await ctx.request.validateUsing(createMaterialValidator)

    // Vérifier que la pièce existe
    const piece = await Piece.findOrFail(data.piece_id)

    // Si c'est le premier matériel, le marquer comme défaut
    const existingMaterials = await Material.query()
      .where('piece_id', data.piece_id)
      .count('* as total')
    const isFirstMaterial = Number(existingMaterials[0].$extras.total) === 0

    const material = await Material.create({
      ...data,
      is_default: isFirstMaterial || data.is_default || false,
      is_active: true,
    })

    // Si marqué comme défaut, s'assurer qu'il n'y en a qu'un seul
    if (material.is_default) {
      await Material.query()
        .where('piece_id', data.piece_id)
        .where('id', '!=', material.id)
        .update({ is_default: false })
    }

    // Charger les relations
    await material.load('piece')
    await material.load('files')

    return ctx.response.json({
      success: true,
      material,
      message: 'Matériel créé avec succès',
    })
  }

  // Mettre à jour un matériel
  async update(ctx: HttpContext) {
    const materialId = ctx.params.id
    const data = await ctx.request.validateUsing(updateMaterialValidator)

    const material = await Material.findOrFail(materialId)

    // Si on marque ce matériel comme défaut, désactiver les autres
    if (data.is_default && !material.is_default) {
      await Material.query()
        .where('piece_id', material.piece_id)
        .where('id', '!=', material.id)
        .update({ is_default: false })
    }

    material.merge(data)
    await material.save()

    await material.load('piece')
    await material.load('files')

    return ctx.response.json({
      success: true,
      material,
      message: 'Matériel mis à jour avec succès',
    })
  }

  // Dupliquer un matériel
  async duplicate(ctx: HttpContext) {
    const materialId = ctx.params.id
    const { name, description } = ctx.request.body()

    const originalMaterial = await Material.query()
      .where('id', materialId)
      .preload('files')
      .firstOrFail()

    // Créer le nouveau matériel
    const newMaterial = await Material.create({
      piece_id: originalMaterial.piece_id,
      name: name || `${originalMaterial.name} (copie)`,
      description: description || `Copie de "${originalMaterial.name}"`,
      edition: originalMaterial.edition,
      editor: originalMaterial.editor,
      notes: originalMaterial.notes,
      is_default: false,
      is_active: true,
    })

    // Dupliquer les fichiers si demandé
    const { duplicateFiles = false } = ctx.request.body()

    if (duplicateFiles && originalMaterial.files.length > 0) {
      for (const file of originalMaterial.files) {
        await File.create({
          name: file.name,
          type: file.type,
          path: file.path, // Attention : partage le même fichier physique
          size: file.size,
          material_id: newMaterial.id,
          piece_id: originalMaterial.piece_id,
          instrument_part: file.instrument_part,
          part_order: file.part_order,
          content: file.content,
        })
      }
    }

    await newMaterial.updateFilesCount()
    await newMaterial.load('piece')
    await newMaterial.load('files')

    return ctx.response.json({
      success: true,
      material: newMaterial,
      message: 'Matériel dupliqué avec succès',
    })
  }

  // Supprimer un matériel
  async delete(ctx: HttpContext) {
    const materialId = ctx.params.id

    const material = await Material.findOrFail(materialId)

    // Vérifier que le matériel n'est pas utilisé dans des projets
    const projectsUsingMaterial = await db
      .from('performed_ins')
      .where('material_id', materialId)
      .count('* as total')

    if (Number(projectsUsingMaterial[0].total) > 0) {
      return ctx.response.badRequest({
        success: false,
        message: 'Ce matériel est utilisé dans des projets et ne peut pas être supprimé',
      })
    }

    // Supprimer les fichiers associés
    const files = await File.query().where('material_id', materialId)
    for (const file of files) {
      // Supprimer physiquement les fichiers si nécessaire
      // await fs.unlink(file.path).catch(() => {})
      await file.delete()
    }

    // Si c'était le matériel par défaut, marquer un autre comme défaut
    if (material.is_default) {
      const nextMaterial = await Material.query()
        .where('piece_id', material.piece_id)
        .where('id', '!=', material.id)
        .where('is_active', true)
        .first()

      if (nextMaterial) {
        nextMaterial.is_default = true
        await nextMaterial.save()
      }
    }

    await material.delete()

    return ctx.response.json({
      success: true,
      message: 'Matériel supprimé avec succès',
    })
  }

  // Définir un matériel comme défaut
  async setAsDefault(ctx: HttpContext) {
    const materialId = ctx.params.id

    const material = await Material.findOrFail(materialId)

    // Désactiver le défaut pour tous les autres matériels de cette pièce
    await Material.query()
      .where('piece_id', material.piece_id)
      .where('id', '!=', material.id)
      .update({ is_default: false })

    // Activer le défaut pour ce matériel
    material.is_default = true
    await material.save()

    return ctx.response.json({
      success: true,
      message: 'Matériel défini comme défaut',
    })
  }

  // Assigner un matériel à un projet
  async assignToProject(ctx: HttpContext) {
    const { projectId, pieceId, materialId } = ctx.request.body()

    await db
      .from('performed_ins')
      .where('project_id', projectId)
      .where('piece_id', pieceId)
      .update({
        material_id: materialId,
        material_specified: true,
      })

    // Mettre à jour le compteur de projets du matériel
    const material = await Material.find(materialId)
    if (material) {
      await material.updateProjectsCount()
    }

    return ctx.response.json({
      success: true,
      message: 'Matériel assigné au projet',
    })
  }

  // Obtenir les pièces sans matériel spécifié pour un projet
  async getUnspecifiedMaterials(ctx: HttpContext) {
    const projectId = ctx.params.projectId

    const pieces = await db
      .from('performed_ins')
      .select('pieces.*', 'performed_ins.material_specified', 'performed_ins.material_id')
      .join('pieces', 'pieces.id', 'performed_ins.piece_id')
      .leftJoin('materials', 'materials.id', 'performed_ins.material_id')
      .leftJoin('composers', 'composers.id', 'pieces.composer_id')
      .where('performed_ins.project_id', projectId)
      .where('performed_ins.material_specified', false)
      .select('pieces.name as piece_name', 'composers.short_name as composer_name')

    return ctx.response.json(pieces)
  }
}
