import vine from '@vinejs/vine'

export const createParticipantValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    accepted: vine.boolean(),
    project: vine.object({
      id: vine.number(),
    }),
    section: vine.object({
      id: vine.number(),
    }),
    contact: vine.object({
      id: vine.number(),
    }),
    answers: vine.array(vine.object({ formId: vine.number(), text: vine.string().nullable() })),
    concerts: vine.array(vine.object({ id: vine.number() })),
    rehearsals: vine.array(vine.object({ id: vine.number() })),
  })
)
