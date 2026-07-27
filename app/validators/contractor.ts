import vine from '@vinejs/vine'

export const createContractorValidator = vine.compile(
  vine.object({
    first_name: vine.string().trim().minLength(1),
    last_name: vine.string().trim().minLength(1),

    email_1: vine.string().email().optional(),
    email_2: vine.string().email().optional(),
    email_3: vine.string().email().optional(),

    phone_1: vine.string().optional(),
    phone_2: vine.string().optional(),
    phone_3: vine.string().optional(),

    comments: vine.string().optional(),

    organization_id: vine.number().optional(),

    category_ids: vine.array(vine.number()).optional(),
  })
)