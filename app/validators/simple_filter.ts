import vine from '@vinejs/vine'

export const simpleFilterValidator = vine.compile(
  vine.object({
    filter: vine.string().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional().requiredIfExists('page'),
    orderBy: vine.string().optional(),
    order: vine.string().in(['asc', 'desc']).optional().requiredIfExists('orderBy'),
  })
)
