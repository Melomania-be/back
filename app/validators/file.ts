import vine from '@vinejs/vine'
import { fileTypeFromFile } from 'file-type'

const secureMagicNumber = vine.createRule(async (value: unknown, options, field) => {
  const file = value as any
  if (!file || !file.tmpPath) return
  try {
    const detectedType = await fileTypeFromFile(file.tmpPath)

    if (detectedType) {
      const dangerousExts = ['exe', 'dll', 'bat', 'cmd', 'sh', 'elf', 'bin', 'msi', 'deb', 'rpm']

      if (dangerousExts.includes(detectedType.ext)) {
        field.report(
          `Alerte de sécurité : Ce fichier prétend être un ${file.extname} mais contient du code exécutable (${detectedType.ext}) !`,
          'magic_number_violation',
          field
        )
      }
    }
  } catch (error) {
    field.report("Impossible de vérifier l'intégrité du fichier.", 'file_integrity', field)
  }
})

export const filesUploadValidator = vine.compile(
  vine.object({
    file: vine
      .file({
        size: '3500mb',
        extnames: [
          'jpg',
          'png',
          'pdf',
          'docx',
          'doc',
          'xls',
          'xlsx',
          'ppt',
          'pptx',
          'txt',
          'mp3',
          'wav',
          'csv',
        ],
      })
      .use(secureMagicNumber())
      .nullable()
      .optional()
      .requiredIfMissing('files'),
    files: vine
      .array(
        vine.file({
          size:'3500 mb',
          extnames: [
            'jpg',
            'png',
            'pdf',
            'docx',
            'doc',
            'xls',
            'xlsx',
            'ppt',
            'pptx',
            'txt',
            'mp3',
            'wav',
            'csv',
          ],
        }).use(secureMagicNumber())
      )
      .nullable()
      .optional(),
  })
)

export const filesUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().optional(),
    type: vine.string().optional(),
    content: vine.string().optional(),
    path: vine.string().optional(),
  })
)
