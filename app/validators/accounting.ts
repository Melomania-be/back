import vine from '@vinejs/vine'

export const createAccountingValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),

    name: vine.string(),
    amount: vine.number(),

    bill_date: vine.date().optional(),
    payment_date: vine.date().optional(),
    attachement: vine.string().optional(),

    category_id: vine.number().optional(),
    contact_id: vine.number().optional(),

    is_individual_payment : vine.boolean().optional(),
    is_musician_fee : vine.boolean().optional(),


    project: vine.object({
      id: vine.number(),
    }),
  })
)