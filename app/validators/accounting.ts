import vine from '@vinejs/vine'

export const createAccountingValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string().trim().minLength(1),
    amount: vine.number(),
    bill_date: vine.date().optional().nullable(),
    payment_date: vine.date().optional().nullable(),
    attachment: vine.string().optional().nullable(),
    category_id: vine.number().optional().nullable(),
    contact_id: vine.number().optional().nullable(),
    is_individual_payment: vine.boolean().optional(),
    is_musician_fee: vine.boolean().optional(),
    project: vine.object({
      id: vine.number(),
    }).optional(), // Le projet peut être optionnel car on peut utiliser l'ID des params
  })
)
