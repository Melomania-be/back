import vine from '@vinejs/vine'

export const createRegistrationValidator = vine.compile(
  vine.object({
    content: vine.array(
      vine.object({
        title: vine.string(),
        text: vine.string(),
      })
    ),
    form: vine.array(
      vine.object({
        text: vine.string(),
        type: vine.string(),
      })
    ),
    params: vine.object({
      id: vine.number(),
    }),
  })
)

export const userRegistrationValidator = vine.compile(
  vine.object({
    id: vine.number().nullable(),
    first_name: vine.string(),
    last_name: vine.string(),
    email: vine.string(),
    phone: vine.string().optional(),
    messenger: vine.string().optional(),
    validated_contact: vine.boolean(),
    rehearsals: vine.array(
      vine.object({
        id: vine.number(),
        comment: vine.string().optional(),
      })
    ),
    concerts: vine.array(
      vine.object({
        id: vine.number(),
        comment: vine.string().optional(),
      })
    ),
    project_id: vine.number(),
    section_id: vine.number(),
    answers: vine.array(
      vine.object({
        text: (vine.string() || vine.boolean()).nullable(),
        form_id: vine.number(),
      })
    ),
  })
)
