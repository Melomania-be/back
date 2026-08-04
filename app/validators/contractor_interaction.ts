import vine from '@vinejs/vine'

export const createContractorInteractionValidator = vine.compile(
  vine.object({
    contractor_contact_id: vine.number(),

    interaction_date: vine.date(),

    description: vine.string().trim().minLength(1),
  })
)
export const updateContractorInteractionValidator = vine.compile(
  vine.object({
    contractor_contact_id: vine.number().optional(),
    interaction_date: vine.date().optional(),
    description: vine.string().trim().minLength(1).optional(),
  })
)
