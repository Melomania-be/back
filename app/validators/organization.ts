import vine from '@vinejs/vine'

export const createOrganizationValidator = vine.compile(
  vine.object({
    name: vine.string(),
  })
)