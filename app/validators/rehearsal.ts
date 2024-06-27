import vine from '@vinejs/vine'

export const createContactValidator = vine.compile(
  vine.object({
    date: vine.date(),
    project_id: vine.number(),
  })
)
