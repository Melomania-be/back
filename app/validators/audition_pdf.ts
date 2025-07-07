// app/validators/audition_pdf.ts
import vine from '@vinejs/vine'

export const uploadAuditionPdfValidator = vine.compile(
  vine.object({
    file: vine.file({
      size: '25mb',
      extnames: ['pdf']
    }),
    title: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().optional(),
    section_id: vine.number(),
    order: vine.number().optional()
  })
)

// Mise à jour du validator existant pour inclure les PDFs dans la création d'audition
export const createAuditionWithPdfsValidator = vine.compile(
  vine.object({
    instructions: vine.string().optional(),
    required_files: vine.array(vine.string()).optional(),
    deadline: vine.string().optional(),
    pdf_files: vine.array(
      vine.object({
        title: vine.string().trim().minLength(1),
        description: vine.string().optional(),
        section_id: vine.number(),
        order: vine.number().optional(),
        file_id: vine.number()
      })
    ).optional()
  })
)
