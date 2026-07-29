import type { HttpContext } from '@adonisjs/core/http'

const ipStore = new Map()
const emailStore = new Map()

export default class RateLimiterMiddleware {
  async handle({ request, response }: HttpContext, next: () => Promise) {
    const ip = request.ip()
    const email = request.input('email')
    const now = Date.now()

    const ipData = ipStore.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 }
    if (now > ipData.resetAt) {
      ipData.count = 0
      ipData.resetAt = now + 15 * 60 * 1000
    }
    ipData.count++
    ipStore.set(ip, ipData)

    let emailData
    if (email) {
      emailData = emailStore.get(email) || { count: 0, resetAt: now + 5 * 60 * 1000 }
      if (now > emailData.resetAt) {
        emailData.count = 0
        emailData.resetAt = now + 5 * 60 * 1000
      }
      emailData.count++
      emailStore.set(email, emailData)
    }

    if (ipData.count > 5 || (emailData && emailData.count > 1)) {
      return response.status(429).send({ message: 'Too many requests. Please try again later.' })
    }

    await next()
  }
}
