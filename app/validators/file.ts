import vine from '@vinejs/vine'

export const filesUploadValidator = vine.compile(
  vine.object({
    file: vine
      .file({
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
      .nullable()
      .optional()
      .requiredIfMissing('files'),
    files: vine
      .array(
        vine.file({
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
