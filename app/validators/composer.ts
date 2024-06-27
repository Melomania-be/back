import vine from '@vinejs/vine'

export const createComposerValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    short_name: vine.string(),
    long_name: vine.string(),
    birth_date: vine.date({ formats: ['x'] }),
    death_date: vine.date({ formats: ['x'] }),
    country: vine.string(),
    main_style: vine.string(),
  })
)
