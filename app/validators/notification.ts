import vine from '@vinejs/vine'

export const registerDeviceTokenValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(20),
    platform: vine.string().trim(),
    provider: vine.string().trim().optional(),
    device_label: vine.string().trim().optional(),
    app_version: vine.string().trim().optional(),
  })
)
