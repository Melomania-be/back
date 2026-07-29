import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging, type SendResponse } from 'firebase-admin/messaging'
import env from '#start/env'
import DeviceToken from '#models/device_token'

type PushPayload = {
  title: string
  body: string
  data?: Record<string, any> | null
}

let firebaseAppInitialized = false

function normalizePrivateKey(privateKey: string | undefined): string | undefined {
  if (!privateKey) return undefined
  return privateKey.replace(/\\n/g, '\n')
}

export default class FirebasePushService {
  static isConfigured(): boolean {
    return Boolean(
      env.get('FIREBASE_PROJECT_ID') &&
        env.get('FIREBASE_CLIENT_EMAIL') &&
        env.get('FIREBASE_PRIVATE_KEY')
    )
  }

  static initialize() {
    if (firebaseAppInitialized || !this.isConfigured()) {
      return
    }

    initializeApp({
      credential: cert({
        projectId: env.get('FIREBASE_PROJECT_ID'),
        clientEmail: env.get('FIREBASE_CLIENT_EMAIL'),
        privateKey: normalizePrivateKey(env.get('FIREBASE_PRIVATE_KEY')),
      }),
    })

    firebaseAppInitialized = true
  }

  static async sendToRecipient(recipient: { userId: number | null; contactId: number | null }, payload: PushPayload) {
    if (!this.isConfigured()) {
      return { sent: false, reason: 'firebase_not_configured' as const }
    }

    this.initialize()

    const deviceTokens = await DeviceToken.query()
      .if(recipient.userId !== null, (builder) => builder.where('user_id', recipient.userId as number))
      .if(recipient.contactId !== null, (builder) => builder.orWhere('contact_id', recipient.contactId as number))

    if (deviceTokens.length === 0) {
      return { sent: false, reason: 'no_device_tokens' as const }
    }

    const dataEntries = Object.entries(payload.data || {}).reduce(
      (acc, [key, value]) => {
        if (value === null || value === undefined) return acc
        acc[key] = String(value)
        return acc
      },
      {} as Record<string, string>
    )

    const app = getApps()[0]
    const result = await getMessaging(app).sendEachForMulticast({
      tokens: deviceTokens.map((deviceToken) => deviceToken.token),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: dataEntries,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
    })

    const invalidTokens: string[] = []

    result.responses.forEach((response: SendResponse, index: number) => {
      if (response.success) return

      const errorCode = response.error?.code || ''
      if (
        errorCode.includes('registration-token-not-registered') ||
        errorCode.includes('invalid-registration-token')
      ) {
        invalidTokens.push(deviceTokens[index].token)
      }
    })

    if (invalidTokens.length > 0) {
      await DeviceToken.query().whereIn('token', invalidTokens).delete()
    }

    return {
      sent: result.successCount > 0,
      successCount: result.successCount,
      failureCount: result.failureCount,
    }
  }
}
