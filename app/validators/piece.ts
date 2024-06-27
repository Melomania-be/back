import vine from '@vinejs/vine'

export const createPieceValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    arranger: vine.string().nullable(),
    name: vine.string(),
    opus: vine.string(),
    year_of_composition: vine.string(),
    type_of_piece_id: vine.number(),
    composer_id: vine.number(),
    folder_id: vine.number().nullable(),
  })
)
