import { DateTime } from 'luxon'
import Notification from '#models/notification'
import DeviceToken from '#models/device_token'
import User from '#models/user'
import Contact from '#models/contact'
import Participant from '#models/participant'
import FirebasePushService from '#services/firebase_push_service'

type Recipient = {
  userId: number | null
  contactId: number | null
}

type NotifyPayload = {
  type: string
  title: string
  body: string
  data?: Record<string, any> | null
  projectId?: number | null
  actorUserId?: number | null
}

type RegisterDevicePayload = {
  userId: number | null
  contactId: number | null
  token: string
  platform: string
  provider?: string
  deviceLabel?: string
  appVersion?: string
}

export default class NotificationService {
  private static pushEnabledTypes = new Set([
    'project_application_submitted',
    'recruitment_status_changed',
  ])

  static async syncUserContactLink(user: User): Promise<Recipient> {
    if (user.contact_id) {
      await DeviceToken.query()
        .where('user_id', user.id)
        .whereNull('contact_id')
        .update({
          contact_id: user.contact_id,
          updated_at: DateTime.now().toSQL(),
        })

      return {
        userId: user.id,
        contactId: user.contact_id,
      }
    }

    const matchedContact = await Contact.query()
      .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
      .first()

    if (!matchedContact) {
      return {
        userId: user.id,
        contactId: null,
      }
    }

    user.contact_id = matchedContact.id
    await user.save()

    await DeviceToken.query()
      .where('user_id', user.id)
      .update({
        contact_id: matchedContact.id,
        updated_at: DateTime.now().toSQL(),
      })

    return {
      userId: user.id,
      contactId: matchedContact.id,
    }
  }

  static async resolveRecipientForUser(user: User): Promise<Recipient> {
    return this.syncUserContactLink(user)
  }

  static async resolveUserIdForContact(contactId: number | null): Promise<number | null> {
    if (!contactId) return null

    const linkedUser = await User.query().where('contact_id', contactId).first()
    if (linkedUser) return linkedUser.id

    const contact = await Contact.find(contactId)
    if (!contact?.email) return null

    const emailMatchedUser = await User.query()
      .whereRaw('LOWER(email) = ?', [contact.email.toLowerCase()])
      .first()

    return emailMatchedUser?.id ?? null
  }

  static async createForRecipient(recipient: Recipient, payload: NotifyPayload) {
    if (!recipient.userId && !recipient.contactId) {
      return null
    }

    const notification = await Notification.create({
      user_id: recipient.userId,
      contact_id: recipient.contactId,
      project_id: payload.projectId ?? null,
      actor_user_id: payload.actorUserId ?? null,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? null,
    })

    await this.sendPushIfNeeded(notification, recipient)

    return notification
  }

  static async createForContact(contactId: number, payload: NotifyPayload) {
    const userId = await this.resolveUserIdForContact(contactId)

    return this.createForRecipient(
      {
        userId,
        contactId,
      },
      payload
    )
  }

  static async createForUserName(userName: string | null | undefined, payload: NotifyPayload) {
    const userId = await this.resolveUserIdByIdentity(userName)
    if (!userId) {
      return null
    }

    return this.createForUserId(userId, payload)
  }

  static async createForUserId(userId: number | null | undefined, payload: NotifyPayload) {
    if (!userId) return null

    const user = await User.find(userId)
    if (!user) return null

    const recipient = await this.resolveRecipientForUser(user)
    return this.createForRecipient(recipient, payload)
  }

  static async resolveUserIdByIdentity(identity: string | null | undefined): Promise<number | null> {
    const normalizedIdentity = (identity || '').trim().toLowerCase()
    if (!normalizedIdentity) return null

    let user = await User.query().whereRaw('LOWER(full_name) = ?', [normalizedIdentity]).first()

    if (!user) {
      user = await User.query().whereRaw('LOWER(email) = ?', [normalizedIdentity]).first()
    }

    return user?.id ?? null
  }

  static async createForParticipant(participant: Participant, payload: NotifyPayload) {
    if (!participant.contact_id) return null
    return this.createForContact(participant.contact_id, payload)
  }

  static async createForParticipants(participants: Participant[], payload: NotifyPayload) {
    const uniqueContactIds = [...new Set(participants.map((participant) => participant.contact_id).filter(Boolean))]

    for (const contactId of uniqueContactIds) {
      await this.createForContact(contactId as number, payload)
    }
  }

  static async listForRecipient(recipient: Recipient, options?: { unreadOnly?: boolean; limit?: number }) {
    const query = Notification.query()
      .if(recipient.userId !== null, (builder) => builder.where('user_id', recipient.userId as number))
      .if(recipient.userId === null && recipient.contactId !== null, (builder) =>
        builder.where('contact_id', recipient.contactId as number)
      )
      .if(options?.unreadOnly === true, (builder) => builder.whereNull('read_at'))
      .orderBy('created_at', 'desc')

    if (options?.limit) {
      query.limit(options.limit)
    }

    return query
  }

  static async markAsReadForRecipient(
    notificationId: number,
    recipient: Recipient
  ): Promise<Notification | null> {
    const notification = await Notification.query()
      .where('id', notificationId)
      .if(recipient.userId !== null, (builder) => builder.where('user_id', recipient.userId as number))
      .if(recipient.userId === null && recipient.contactId !== null, (builder) =>
        builder.where('contact_id', recipient.contactId as number)
      )
      .first()

    if (!notification) return null

    notification.read_at = DateTime.now()
    await notification.save()
    return notification
  }

  static async markAllAsReadForRecipient(recipient: Recipient): Promise<number> {
    const updatedRows = await Notification.query()
      .if(recipient.userId !== null, (builder) => builder.where('user_id', recipient.userId as number))
      .if(recipient.userId === null && recipient.contactId !== null, (builder) =>
        builder.where('contact_id', recipient.contactId as number)
      )
      .whereNull('read_at')
      .update({
        read_at: DateTime.now().toSQL(),
        updated_at: DateTime.now().toSQL(),
      })

    return updatedRows[0] ?? 0
  }

  static async registerDeviceToken(payload: RegisterDevicePayload) {
    const existingToken = await DeviceToken.findBy('token', payload.token)

    if (existingToken) {
      existingToken.merge({
        user_id: payload.userId,
        contact_id: payload.contactId,
        platform: payload.platform,
        provider: payload.provider || 'fcm',
        device_label: payload.deviceLabel || null,
        app_version: payload.appVersion || null,
        last_seen_at: DateTime.now(),
      })
      await existingToken.save()
      return existingToken
    }

    return DeviceToken.create({
      user_id: payload.userId,
      contact_id: payload.contactId,
      platform: payload.platform,
      provider: payload.provider || 'fcm',
      token: payload.token,
      device_label: payload.deviceLabel || null,
      app_version: payload.appVersion || null,
      last_seen_at: DateTime.now(),
    })
  }

  private static async sendPushIfNeeded(notification: Notification, recipient: Recipient) {
    if (!this.pushEnabledTypes.has(notification.type)) {
      return
    }

    try {
      const pushResult = await FirebasePushService.sendToRecipient(recipient, {
        title: notification.title,
        body: notification.body,
        data: {
          notification_id: notification.id,
          type: notification.type,
          ...(notification.data || {}),
        },
      })

      if (pushResult.sent) {
        notification.sent_push_at = DateTime.now()
        await notification.save()
      }
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }
}
