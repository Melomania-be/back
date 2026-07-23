import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

export const loginThrottle = limiter.define('loginThrottle', (ctx: HttpContext) => {
  return limiter
    .allowRequests(3)
    .every('1 minute')
    .usingKey(ctx.request.ip())
})