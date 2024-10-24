import vine from '@vinejs/vine'

export const createSectionGroupValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string(),
    sections: vine.array(
      vine.object({
        id: vine.number().optional(),
        name: vine.string(),
        pivot_order: vine.number().optional(),
      })
    ),
  })
)
