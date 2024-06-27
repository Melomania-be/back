import vine from '@vinejs/vine'

/**
 * Validates the user's login action
 */

export const userLoginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)

/**
 * Validates the user's creation action
 */
export const userCreationValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().confirmed(),
  })
)
