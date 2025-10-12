import vine from '@vinejs/vine'

export const filesystemUploadValidator = vine.compile(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: '2gb',
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
        })
      )
      .nullable()
      .optional(),
    file: vine
      .file({
        size: '2gb',
        extnames: [
          'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff',
          'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
          'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma',
          'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v',
          'zip', 'rar', '7z', 'tar', 'gz',
          'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'
        ],
      })
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
