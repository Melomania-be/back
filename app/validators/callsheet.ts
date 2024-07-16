import vine from '@vinejs/vine'

export const createCallsheetValidator = vine.compile(
  vine.object({
    id: vine.number().optional(),
    version: vine.string(),
    project_id: vine.number(),
    contents: vine.array(
      vine.object({
        id: vine.number().optional(),
        title: vine.string(),
        text: vine.string(),
      })
    ),
  })
)

export const getCallsheetValidator = vine.compile(
  vine.object({
    params: vine.object({
      visitorId: vine.number().optional(),
      id: vine.number(),
    }),
  })
)
