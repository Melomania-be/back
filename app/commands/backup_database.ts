import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { execa } from 'execa'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import mail from '@adonisjs/mail/services/main'

export default class BackupDatabase extends BaseCommand {
  static commandName = 'backup:database'
  static description = 'Sauvegarde la base de données et envoie le fichier par email'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Démarrage de la sauvegarde de la base de données...')

    // ✅ CORRECTION #122 — PG_DUMP_PATH depuis variable d'environnement
    // - En production Linux : 'pg_dump' (dans le PATH système)
    // - En local Windows  : 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
    // ❌ AVANT : const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe'
    const pgDumpPath = env.get('PG_DUMP_PATH') || 'pg_dump'

    // ✅ CORRECTION #122 — Email de destination depuis .env uniquement
    // Jamais depuis une entrée utilisateur
    const backupEmail = env.get('BACKUP_EMAIL')

    if (!backupEmail) {
      this.logger.error('Variable d\'environnement BACKUP_EMAIL non définie. Sauvegarde annulée.')
      this.exitCode = 1
      return
    }

    const dbHost = env.get('DB_HOST')
    const dbPort = env.get('DB_PORT') || '5432'
    const dbUser = env.get('DB_USER')
    const dbName = env.get('DB_DATABASE')
    const dbPassword = env.get('DB_PASSWORD')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = join(tmpdir(), `melomania-backup-${timestamp}.sql`)

    try {
      this.logger.info(`Exécution de pg_dump : ${pgDumpPath}`)

      await execa(pgDumpPath, [
        '-h', dbHost,
        '-p', String(dbPort),
        '-U', dbUser,
        '-d', dbName,
        '-f', outputPath,
      ], {
        env: {
          ...process.env,
          // Le mot de passe est passé via variable d'environnement PGPASSWORD
          // pour ne pas l'exposer dans les arguments de la commande
          PGPASSWORD: dbPassword,
        },
      })

      this.logger.info('Sauvegarde générée. Envoi par email...')

      await mail.sendLater((message) => {
        message
          .to(backupEmail)
          .from(env.get('SMTP_USERNAME'))
          .subject(`[Melomania] Sauvegarde hebdomadaire — ${timestamp}`)
          .text(
            'Bonjour,\n\n' +
            'Veuillez trouver en pièce jointe la sauvegarde automatique hebdomadaire ' +
            'de la base de données Melomania.\n\n' +
            'Ce message est généré automatiquement.'
          )
          .attach(outputPath, {
            filename: `melomania-backup-${timestamp}.sql`,
          })
      })

      this.logger.info(`Sauvegarde envoyée avec succès à ${backupEmail}`)

      // Nettoyage du fichier temporaire
      await unlink(outputPath)
      this.logger.info('Fichier temporaire supprimé.')

    } catch (error) {
      this.logger.error(`Échec de la sauvegarde : ${(error as Error).message}`)
      this.exitCode = 1
    }
  }
}
