import vine from '@vinejs/vine'

export const createTypeOfPieceValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string(),
  })
)
