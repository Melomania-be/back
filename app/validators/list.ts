import vine from '@vinejs/vine'

export const createListValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string(),
    contacts: vine.array(
      vine.object({
        id: vine.number(),
        first_name: vine.string(),
        last_name: vine.string(),
      })
    ),
    mailTemplate: vine.any().optional(),
  })
)
