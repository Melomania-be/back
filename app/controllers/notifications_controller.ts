import type { HttpContext } from '@adonisjs/core/http'
import NotificationService from '#services/notification_service'
import { registerDeviceTokenValidator } from '#validators/notification'

export default class NotificationsController {
  async getMine({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const recipient = await NotificationService.resolveRecipientForUser(user)
    const unreadOnly = request.input('unreadOnly') === 'true'
    const limit = Number(request.input('limit') || 50)

    const notifications = await NotificationService.listForRecipient(recipient, {
      unreadOnly,
      limit: Number.isNaN(limit) ? 50 : Math.min(limit, 100),
    })

    return response.ok(notifications)
  }

  async markAsRead({ auth, params, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const recipient = await NotificationService.resolveRecipientForUser(user)
    const notification = await NotificationService.markAsReadForRecipient(
      Number(params.id),
      recipient
    )

    if (!notification) {
      return response.notFound({ error: 'Notification not found' })
    }

    return response.ok(notification)
  }

  async markAllAsRead({ auth, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const recipient = await NotificationService.resolveRecipientForUser(user)
    const updated = await NotificationService.markAllAsReadForRecipient(recipient)

    return response.ok({ updated })
  }

  async registerDeviceToken({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const payload = await request.validateUsing(registerDeviceTokenValidator)
    const recipient = await NotificationService.resolveRecipientForUser(user)

    const deviceToken = await NotificationService.registerDeviceToken({
      userId: user.id,
      contactId: recipient.contactId,
      token: payload.token,
      platform: payload.platform,
      provider: payload.provider,
      deviceLabel: payload.device_label,
      appVersion: payload.app_version,
    })

    return response.ok(deviceToken)
  }
}
