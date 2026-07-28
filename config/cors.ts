import { defineConfig } from '@adonisjs/cors'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  // On lit la variable d'environnement, on sépare les URL par des virgules,
  // et on met localhost par défaut si rien n'est défini.
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173'],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
