import vine from '@vinejs/vine'

export const createExpenseCategoryValidator = vine.compile(
  vine.object({
    id: vine.number().optional(), // optionnel pour update
    name: vine.string().trim().minLength(1).maxLength(100),
    description: vine.string().optional().nullable(),
    color: vine.string().trim().minLength(1).maxLength(100).optional().nullable()
  })
)