// app/validators/material.ts
import vine from '@vinejs/vine'

export const createMaterialValidator = vine.compile(
  vine.object({
    piece_id: vine.number(),
    name: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(1000).optional(),
    edition: vine.string().trim().maxLength(255).optional(),
    editor: vine.string().trim().maxLength(255).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    is_default: vine.boolean().optional()
  })
)

export const updateMaterialValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().maxLength(1000).optional(),
    edition: vine.string().trim().maxLength(255).optional(),
    editor: vine.string().trim().maxLength(255).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    is_default: vine.boolean().optional(),
    is_active: vine.boolean().optional()
  })
)


export const materialFilesUploadValidator = vine.compile(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: '50mb',
          extnames: [
            // Documents musicaux
            'pdf', 'musicxml', 'mxl', 'mid', 'midi',
            // Images (pour partitions scannées)
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff',
            // Documents
            'doc', 'docx', 'txt', 'rtf',
            // Autres formats courants
            'zip', 'rar'
          ],
        })
      )
      .minLength(1),
    instrumentParts: vine.array(vine.string()).optional()
  })
)

export const assignMaterialValidator = vine.compile(
  vine.object({
    projectId: vine.number(),
    pieceId: vine.number(),
    materialId: vine.number()
  })
)

export const duplicateMaterialValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().maxLength(1000).optional(),
    duplicateFiles: vine.boolean().optional()
  })
)
