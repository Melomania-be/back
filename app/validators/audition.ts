// app/validators/audition.ts - RESTRICTION AUDIO/VIDÉO

import vine from '@vinejs/vine'

export const createAuditionValidator = vine.compile(
  vine.object({
    instructions: vine.string().optional(),
    required_files: vine.array(vine.string()).optional(),
    deadline: vine.string().optional(), // Accepter comme string d'abord
  })
)

export const submitAuditionValidator = vine.compile(
  vine.object({
    notes: vine.string().optional(),
  })
)

// ✅ VALIDATOR CORRIGÉ - RESTRICTION AUDIO/VIDÉO SEULEMENT
export const uploadAuditionFileValidator = vine.compile(
  vine.object({
    file: vine.file({
      size: '2gb',
      extnames: [
        // ✅ VIDÉO SEULEMENT
        'mp4',
        'avi',
        'mov',
        'wmv',
        'flv',
        'mkv',
        'webm',
        'm4v',
        // ✅ AUDIO SEULEMENT
        'mp3',
        'wav',
        'aac',
        'flac',
        'ogg',
        'm4a',
        'wma',
        // ✅ SUPPRIMÉ : PDF, images et autres types
        // 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'
      ],
    }),
    // ✅ RESTRICTION : Seulement video et audio
    fileType: vine.enum(['video', 'audio']),
    description: vine.string().trim().minLength(1).maxLength(255),
  })
)
