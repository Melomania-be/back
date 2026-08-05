import vine from '@vinejs/vine'

export const createCompanyValidator = vine.compile(
  vine.object({
    name: vine.string(),
    comments: vine.string().nullable().optional(),
  })
)