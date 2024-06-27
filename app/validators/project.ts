import vine from '@vinejs/vine'

export const createProjectValidator = vine.compile(
  vine.object({
    name: vine.string(),
    section_group_id: vine.number(),
    registration_id: vine.number(),
  })
)
