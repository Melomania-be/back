import vine from '@vinejs/vine'

/**
 * Validates the post's creation action
 */
export const createInstrumentValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string(),
    family: vine.string(),
  })
)
