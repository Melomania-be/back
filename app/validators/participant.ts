import vine from '@vinejs/vine'

export const createParticipantValidator = vine.compile(
  vine.object({
    last_activity: vine.date({ formats: ['x'] }),
    accepted: vine.boolean(),
    project: vine.number(),
    section: vine.number(),
    contact: vine.number(),
    answer: vine.number().optional(),
  })
)
