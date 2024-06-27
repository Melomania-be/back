import vine from '@vinejs/vine'

export const createRegistrationValidator = vine.compile(
  vine.object({
    //status : vine.boolean(),
    last_send_date: vine.date({ formats: ['x'] }),
    content: vine.array(
      vine.object({
        id: vine.number(),
        title: vine.string(),
        text: vine.string(),
      })
    ),
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
    rehearsals: vine.array(vine.number()),
    project_id: vine.number(),
    section_id: vine.number(),
    answer: vine
      .object({
        text: vine.string() || vine.boolean(),
        form_id: vine.number(),
      })
      .optional(),
  })
)
