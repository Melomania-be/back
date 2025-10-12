import vine from '@vinejs/vine'

export const createAccountingEntryValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    name: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().optional().nullable(),
    amount: vine.number().positive(),
    entry_type: vine.enum(['expense', 'income']).optional(),
    payment_status: vine.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
    bill_date: vine.string().optional().nullable(),
    payment_date: vine.string().optional().nullable(),
    due_date: vine.string().optional().nullable(),
    category_id: vine.number().optional().nullable(),
    contact_id: vine.number().optional().nullable(),
    attachment: vine.string().optional().nullable(),
    is_individual_payment: vine.boolean().optional(),
    is_musician_fee: vine.boolean().optional(),
    invoice_number: vine.string().trim().optional().nullable(),
    notes: vine.string().trim().optional().nullable(),
  })
)

export const updateAccountingStatusValidator = vine.compile(
  vine.object({
    payment_status: vine.enum(['pending', 'paid', 'overdue', 'cancelled']),
    payment_date: vine.string().optional().nullable(),
    notes: vine.string().trim().optional().nullable(),
  })
)
