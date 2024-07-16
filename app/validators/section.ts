import vine from '@vinejs/vine'

export const createSectionValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string(),
    size: vine.number(),
    instruments: vine.array(
      vine.object({
        id: vine.number().optional(),
        name: vine.string(),
        family: vine.string(),
      })
    ),
  })
)
