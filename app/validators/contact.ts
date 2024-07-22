import vine from '@vinejs/vine'

/**
 * Validates the post's creation action
 */
export const createContactValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    first_name: vine.string(),
    last_name: vine.string(),
    email: vine.string().email(),
    phone: vine.string().optional(),
    messenger: vine.string().optional(),
    comments: vine.string().optional(),
    validated: vine.boolean(),
    subscribed: vine.boolean(),
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
