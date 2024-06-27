import vine from '@vinejs/vine'

export const folderCreationValidator = vine.compile(
  vine.object({
    name: vine.string(),
  })
)

export const folderUpdateValidator = vine.compile(
  vine.object({
    id: vine.number(),
    name: vine.string(),
    files: vine.array(
      vine.object({
        id: vine.number(),
        name: vine.string(),
        type: vine.string().nullable(),
        content: vine.string().nullable(),
        path: vine.string(),
        createdAt: vine.string(),
        updatedAt: vine.string(),
      })
    ),
  })
)
