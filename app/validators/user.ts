// app/validators/user.ts - Version mise à jour avec fullName
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
    fullName: vine.string().optional(), // 🆕 Champ fullName optionnel
  })
)

/**
 * 🆕 Validates the user's update action
 */
export const userUpdateValidator = vine.compile(
  vine.object({
    email: vine.string().email().optional(),
    fullName: vine.string().optional(),
  })
)
