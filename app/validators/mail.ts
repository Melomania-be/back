import vine from '@vinejs/vine'

export const mailCallsheetValidator = vine.compile(
    vine.object({
        email: vine.string(),
        contact: vine.object({
            first_name: vine.string(),
            last_name: vine.string(), 
            email: vine.string(),  
        }),
        project: vine.object({
            id : vine.number(),
            name: vine.string(),

        }),
        callsheet: vine.object({
            id : vine.number(),
            version: vine.string(),
            project_id: vine.number(),
        }),
        to_contact: vine.object({
            first_name: vine.string(),
            last_name: vine.string(),
            email: vine.string(),
            phone: vine.string(),
            messenger: vine.string(),
        }),
    })
)