import vine from '@vinejs/vine'

export const createCallsheetValidator = vine.compile(
  vine.object({
    version: vine.string(),
    project_id: vine.number(),
    content: vine.array(
      vine.object({
        id: vine.number(),
        title: vine.string(),
        text: vine.string(),
      })
    ),
  })
)

export const getCallsheetValidator = vine.compile(
  vine.object({
    params: vine.object({
      id: vine.number(),
      visitorId: vine.number(),
    }),
  })
)
