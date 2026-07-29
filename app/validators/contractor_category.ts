import vine from '@vinejs/vine'

export const createContractorCategoryValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1),
  })
)