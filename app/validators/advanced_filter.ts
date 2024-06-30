import vine from '@vinejs/vine'

const filter = vine.object({
  relation: vine.string(),
  column: vine.string(),
  operation: vine.string().in(['=', 'like', '>', '<', '>=', '<=', '!=']),
  filter: vine.string(),
})

export const advancedFilterValidator = vine.compile(
  vine.object({
    filters: vine
      .object({
        type: vine.string().in(['or', 'and']),
        filtersDepth1: vine.array(
          vine.object({
            type: vine.string().in(['or', 'and']),
            filtersDepth2: vine.array(filter),
          })
        ),
      })
      .optional(),
    page: vine.number().optional(),
    limit: vine.number().optional().requiredIfExists('page'),
    orderBy: vine.string().optional(),
    order: vine.string().in(['asc', 'desc']).optional().requiredIfExists('orderBy'),
  })
)
