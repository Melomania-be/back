import limiter from '@adonisjs/limiter/services/main'
import { HttpContext } from '@adonisjs/core/http'

export const loginThrottle = limiter.define('login', (ctx: HttpContext) => {
  return limiter
    .allowRequests(3)
    .every('1 min')
    .usingKey(ctx.request.ip())
})
