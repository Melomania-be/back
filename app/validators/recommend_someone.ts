import vine from '@vinejs/vine'

export const createRecommendedValidator = vine.compile(
  vine.object({
    first_name: vine.string(),
    last_name: vine.string(),
    email: vine.string(),
    phone: vine.string(),
    messenger: vine.string(),
  })
)
