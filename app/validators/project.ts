import vine from '@vinejs/vine'

export const createProjectValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string(),
    section_group_id: vine.number(),
    concerts: vine.array(
      vine.object({
        id: vine.number().optional(),
        date: vine.date(),
        place: vine.string(),
        comment: vine.string().optional(),
      })
    ),
    pieces_ids: vine.array(vine.number()),
    rehearsals: vine.array(
      vine.object({
        id: vine.number().optional(),
        date: vine.date(),
        place: vine.string(),
        comment: vine.string().optional(),
      })
    ),
    responsibles_ids: vine.array(vine.number()),
    folder_id: vine.number().optional(),
  })
)
