import vine from '@vinejs/vine'

export const createRecommendedValidator = vine.compile(
  vine.object({
    first_name: vine.string(),
    last_name: vine.string(),
    email: vine.string().optional(),
    phone: vine.string().optional(),
    messenger: vine.string().optional(),
    instruments: vine
      .array(
        vine.object({
          id: vine.number(),
          name: vine.string(),
          pivot_proficiency_level: vine.string(),
        })
      )
      .optional(),
  })
)
