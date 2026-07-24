import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { execa } from 'execa'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import mail from '@adonisjs/mail/services/main'

export default class SettingsController {

  /**
   * Retourne les paramètres actuels de sauvegarde
   */
  async index(ctx: HttpContext) {
    return ctx.response.ok({
      backupEnabled: env.get('BACKUP_ENABLED', 'false') === 'true',
      // ✅ On ne retourne jamais backup_email dans la réponse API
      // pour éviter d'exposer une adresse sensible
    })
  }

  /**
   * Met à jour les paramètres de sauvegarde (activation/désactivation uniquement)
   * ✅ CORRECTION #122 — L'email de destination n'est JAMAIS accepté depuis la requête.
   * Il est lu uniquement depuis la variable d'environnement BACKUP_EMAIL.
   */
  async store(ctx: HttpContext) {
    // ✅ On ignore volontairement tout champ backup_email envoyé dans la requête
    const { backupEnabled } = ctx.request.only(['backupEnabled'])

    // ✅ L'email de sauvegarde vient UNIQUEMENT du .env — jamais de la requête
    const backupEmail = env.get('BACKUP_EMAIL')

    if (!backupEmail) {
      return ctx.response.badRequest({
        error: 'La variable d\'environnement BACKUP_EMAIL n\'est pas configurée sur le serveur.',
      })
    }

    return ctx.response.ok({
      message: 'Paramètres de sauvegarde mis à jour',
      backupEnabled: backupEnabled ?? false,
    })
  }

  /**
   * Déclenche une sauvegarde manuelle immédiate
   * ✅ CORRECTION #122 — Même logique : destination lue depuis .env uniquement
   */
  async sendNow(ctx: HttpContext) {
    // ✅ L'email de destination vient UNIQUEMENT du .env
    const backupEmail = env.get('BACKUP_EMAIL')

    if (!backupEmail) {
      return ctx.response.badRequest({
        error: 'La variable d\'environnement BACKUP_EMAIL n\'est pas configurée sur le serveur.',
      })
    }

    try {
      // ✅ CORRECTION #122 — Chemin pg_dump depuis variable d'environnement
      // Valeur par défaut : 'pg_dump' (présent dans le PATH sur Linux/serveur)
      // En local Windows : PG_DUMP_PATH=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe
      const pgDumpPath = env.get('PG_DUMP_PATH') || 'pg_dump'

      const dbHost = env.get('DB_HOST')
      const dbPort = env.get('DB_PORT') || '5432'
      const dbUser = env.get('DB_USER')
      const dbName = env.get('DB_DATABASE')

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath = join(tmpdir(), `melomania-backup-${timestamp}.sql`)

      // Exécution de pg_dump
      await execa(pgDumpPath, [
        '-h', dbHost,
        '-p', dbPort,
        '-U', dbUser,
        '-d', dbName,
        '-f', outputPath,
      ], {
        env: {
          ...process.env,
          PGPASSWORD: env.get('DB_PASSWORD'),
        },
      })

      // Envoi du fichier de sauvegarde par email
      // ✅ Destination = BACKUP_EMAIL du .env uniquement
      await mail.sendLater((message) => {
        message
          .to(backupEmail)
          .from(env.get('SMTP_USERNAME'))
          .subject(`Sauvegarde Melomania — ${timestamp}`)
          .text('Veuillez trouver en pièce jointe la sauvegarde complète de la base de données Melomania.')
          .attach(outputPath, {
            filename: `melomania-backup-${timestamp}.sql`,
          })
      })

      // Nettoyage du fichier temporaire
      await unlink(outputPath)

      return ctx.response.ok({
        message: `Sauvegarde envoyée avec succès à l'adresse configurée`,
      })

    } catch (error) {
      ctx.logger.error({ event: 'BACKUP_FAILURE', error: (error as Error).message }, 'Échec de la sauvegarde')
      return ctx.response.internalServerError({
        error: 'La sauvegarde a échoué. Vérifiez les logs du serveur.',
      })
    }
  }
}
