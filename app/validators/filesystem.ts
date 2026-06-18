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

export const filesystemUploadValidator = vine.compile(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: '3500mb',
          extnames: [
            // Images
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff',
            // Documents
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
            // Audio
            'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma',
            // Video
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v',
            // Archives
            'zip', 'rar', '7z', 'tar', 'gz',
            // Autres
            'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'
          ],
        }).use(secureMagicNumber())
      )
      .nullable()
      .optional(),
    file: vine
      .file({
        size: '3500mb',
        extnames: [
          'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff',
          'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
          'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma',
          'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v',
          'zip', 'rar', '7z', 'tar', 'gz',
          'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'
        ],
      }).use(secureMagicNumber())
      .nullable()
      .optional(),
    parentId: vine.number().optional(),
    projectId: vine.number().optional(),
    pieceId: vine.number().optional()
  })
)

export const createFolderValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    parentId: vine.number().optional(),
    projectId: vine.number().optional(),
    pieceId: vine.number().optional()
  })
)
