// app/controllers/materials_controller.ts - Version nettoyée
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
  // Générer un nom unique
  async generateUniqueName(pieceId: number, baseName: string, excludeId?: number): Promise<string> {
    let materialName = baseName
    let counter = 1

    while (true) {
      const query = Material.query()
        .where('piece_id', pieceId)
        .where('name', materialName)

      if (excludeId) {
        query.where('id', '!=', excludeId)
      }

      const existing = await query.first()

      if (!existing) {
        return materialName
      }

      materialName = `${baseName} (${counter})`
      counter++

      // Sécurité : éviter une boucle infinie
      if (counter > 100) {
        materialName = `${baseName} (${Date.now()})`
        break
      }
    }

    return materialName
  }

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

    // Calculer le nombre de projets utilisant chaque matériel
    for (const material of materials) {
      const projectCount = await db
        .from('performed_ins')
        .where('material_id', material.id)
        .countDistinct('project_id as total')

      material.projects_count = Number(projectCount[0].total)
    }

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

  // Assignation en masse
  async assignBulk(ctx: HttpContext) {
    try {
      const { assignments } = ctx.request.body()

      // Vérification de base
      if (!assignments || !Array.isArray(assignments)) {
        return ctx.response.status(400).json({
          success: false,
          error: 'Format des assignations invalide'
        })
      }

      // Validation de chaque assignment
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i]

        if (!assignment.projectId || !assignment.pieceId) {
          return ctx.response.status(400).json({
            success: false,
            error: `Assignation ${i} invalide: projectId et pieceId requis`
          })
        }
      }

      // Utiliser une transaction pour garantir la cohérence
      await db.transaction(async (trx) => {
        // Traiter chaque assignation
        for (let i = 0; i < assignments.length; i++) {
          const assignment = assignments[i]

          // Vérifier que la relation performed_ins existe
          const existingRelation = await trx
            .from('performed_ins')
            .where('project_id', assignment.projectId)
            .where('piece_id', assignment.pieceId)
            .first()

          if (!existingRelation) {
            throw new Error(`Relation projet-pièce non trouvée: projet ${assignment.projectId}, pièce ${assignment.pieceId}`)
          }

          // Mettre à jour la relation avec les nouvelles valeurs
          await trx
            .from('performed_ins')
            .where('project_id', assignment.projectId)
            .where('piece_id', assignment.pieceId)
            .update({
              material_id: assignment.materialId,
              material_specified: assignment.materialId !== null,
              updated_at: new Date()
            })
        }
      })

      // Mettre à jour les compteurs de projets pour tous les matériels affectés
      try {
        const materialIds = assignments
          .filter((a) => a.materialId)
          .map((a) => a.materialId)

        const uniqueMaterialIds = [...new Set(materialIds)]

        for (const materialId of uniqueMaterialIds) {
          try {
            const material = await Material.find(materialId)
            if (material) {
              // Calculer le nombre de projets utilisant ce matériel
              const projectCount = await db
                .from('performed_ins')
                .where('material_id', materialId)
                .countDistinct('project_id as total')

              material.projects_count = Number(projectCount[0].total)
              await material.save()
            }
          } catch (countError) {
            // Ne pas arrêter le processus pour cette erreur
          }
        }
      } catch (countUpdateError) {
        // Ne pas arrêter le processus pour cette erreur
      }

      return ctx.response.json({
        success: true,
        message: 'Matériels assignés avec succès',
        processedCount: assignments.length
      })

    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        error: "Erreur lors de l'assignation des matériels",
        details: {
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  // Upload de fichiers pour un matériel
  // Dans uploadFiles() du MaterialsController
  async uploadFiles(ctx: HttpContext) {
    const materialId = ctx.params.id

    try {
      console.log('📤 Starting file upload for material:', materialId)

      const material = await Material.findOrFail(materialId)
      console.log('✅ Material found:', material.name)

      // Validation plus robuste
      const requestFiles = ctx.request.files('files')

      if (!requestFiles || requestFiles.length === 0) {
        return ctx.response.badRequest({
          success: false,
          error: 'Aucun fichier fourni'
        })
      }

      console.log('📂 Files received:', requestFiles.length)

      const uploadedFiles = []
      const errors = []

      // Traiter chaque fichier individuellement
      for (const file of requestFiles) {
        try {
          console.log(`📄 Processing: ${file.clientName}`)

          // Vérifications de sécurité
          if (file.size && file.size > 50 * 1024 * 1024) {
            errors.push(`${file.clientName}: Fichier trop volumineux (max 50MB)`)
            continue
          }

          const fileName = `${cuid()}.${file.extname}`
          await file.move(app.makePath('uploads'), { name: fileName })

          if (!file.filePath) {
            errors.push(`${file.clientName}: Échec du déplacement du fichier`)
            continue
          }

          // Créer l'entrée en base
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
          console.log(`✅ File saved: ${dbFile.name}`)

        } catch (fileError) {
          console.error(`❌ Error with file ${file.clientName}:`, fileError)
          errors.push(`${file.clientName}: ${fileError.message}`)
        }
      }

      // Mettre à jour le compteur
      if (uploadedFiles.length > 0) {
        await material.updateFilesCount()
        await material.load('files') // Recharger les fichiers
      }

      const response = {
        success: uploadedFiles.length > 0,
        files: uploadedFiles,
        errors: errors,
        message: uploadedFiles.length > 0
          ? `${uploadedFiles.length} fichier(s) ajouté(s) avec succès`
          : 'Aucun fichier n\'a pu être traité'
      }

      if (errors.length > 0) {
        response.message += `. ${errors.length} erreur(s) rencontrée(s).`
      }

      return ctx.response.json(response)

    } catch (error) {
      console.error('❌ Critical upload error:', error)
      return ctx.response.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload',
        details: error.message
      })
    }
  }


  // Créer un nouveau matériel
  async create(ctx: HttpContext) {
    try {
      const data = await ctx.request.validateUsing(createMaterialValidator)

      // Vérifier que la pièce existe
      const piece = await Piece.findOrFail(data.piece_id)

      // Génération automatique d'un nom unique
      const uniqueName = await this.generateUniqueName(data.piece_id, data.name)

      // Si c'est le premier matériel, le marquer comme défaut
      const existingMaterials = await Material.query()
        .where('piece_id', data.piece_id)
        .count('* as total')
      const isFirstMaterial = Number(existingMaterials[0].$extras.total) === 0

      const material = await Material.create({
        ...data,
        name: uniqueName,
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

      // Informer l'utilisateur si le nom a été modifié
      const message = uniqueName !== data.name
        ? `Matériel créé avec succès. Le nom a été ajusté en "${uniqueName}" car "${data.name}" existait déjà.`
        : 'Matériel créé avec succès'

      return ctx.response.json({
        success: true,
        material,
        message,
        nameChanged: uniqueName !== data.name,
        originalName: data.name,
        finalName: uniqueName
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        error: 'Erreur lors de la création du matériel',
        details: error.message
      })
    }
  }

  // Mettre à jour un matériel
  async update(ctx: HttpContext) {
    try {
      const materialId = ctx.params.id
      const data = await ctx.request.validateUsing(updateMaterialValidator)

      const material = await Material.findOrFail(materialId)

      let finalName = data.name || material.name
      let nameChanged = false

      // Génération d'un nom unique si nécessaire
      if (data.name && data.name !== material.name) {
        const uniqueName = await this.generateUniqueName(material.piece_id, data.name, material.id)
        finalName = uniqueName
        nameChanged = uniqueName !== data.name
      }

      // Si on marque ce matériel comme défaut, désactiver les autres
      if (data.is_default && !material.is_default) {
        await Material.query()
          .where('piece_id', material.piece_id)
          .where('id', '!=', material.id)
          .update({ is_default: false })
      }

      material.merge({
        ...data,
        name: finalName
      })
      await material.save()

      await material.load('piece')
      await material.load('files')

      // Informer l'utilisateur si le nom a été modifié
      const message = nameChanged
        ? `Matériel mis à jour avec succès. Le nom a été ajusté en "${finalName}" car "${data.name}" existait déjà.`
        : 'Matériel mis à jour avec succès'

      return ctx.response.json({
        success: true,
        material,
        message,
        nameChanged,
        originalName: data.name,
        finalName
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour du matériel',
        details: error.message
      })
    }
  }

  // Dupliquer un matériel
  async duplicate(ctx: HttpContext) {
    try {
      const materialId = ctx.params.id
      const { name, description, duplicateFiles = false } = ctx.request.body()

      const originalMaterial = await Material.query()
        .where('id', materialId)
        .preload('files')
        .firstOrFail()

      const baseName = name || `${originalMaterial.name} (copie)`

      // Génération automatique d'un nom unique
      const uniqueName = await this.generateUniqueName(originalMaterial.piece_id, baseName)

      // Créer le nouveau matériel
      const newMaterial = await Material.create({
        piece_id: originalMaterial.piece_id,
        name: uniqueName,
        description: description || `Copie de "${originalMaterial.name}"`,
        edition: originalMaterial.edition,
        editor: originalMaterial.editor,
        notes: originalMaterial.notes,
        is_default: false,
        is_active: true,
      })

      // Dupliquer les fichiers si demandé
      if (duplicateFiles && originalMaterial.files.length > 0) {
        for (const file of originalMaterial.files) {
          await File.create({
            name: file.name,
            type: file.type,
            path: file.path,
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

      // Informer l'utilisateur si le nom a été modifié
      const message = uniqueName !== baseName
        ? `Matériel dupliqué avec succès. Le nom a été ajusté en "${uniqueName}" car "${baseName}" existait déjà.`
        : 'Matériel dupliqué avec succès'

      return ctx.response.json({
        success: true,
        material: newMaterial,
        message,
        nameChanged: uniqueName !== baseName,
        originalName: baseName,
        finalName: uniqueName
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        error: 'Erreur lors de la duplication du matériel',
        details: error.message
      })
    }
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

  // Suggérer un nom unique avant création
  async suggestUniqueName(ctx: HttpContext) {
    const { pieceId, name } = ctx.request.qs()

    if (!pieceId || !name) {
      return ctx.response.badRequest({
        error: 'pieceId et name sont requis'
      })
    }

    try {
      const uniqueName = await this.generateUniqueName(Number(pieceId), name)

      return ctx.response.json({
        originalName: name,
        suggestedName: uniqueName,
        isUnique: uniqueName === name
      })
    } catch (error) {
      return ctx.response.status(500).json({
        error: 'Erreur lors de la génération du nom'
      })
    }
  }
}
