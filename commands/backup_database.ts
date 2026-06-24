import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { execSync } from 'node:child_process'
import { unlinkSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import mail from '@adonisjs/mail/services/main'
import Save from '#models/save'

export default class BackupDatabase extends BaseCommand {
  static commandName = 'backup:database'
  static description = 'Create a database dump and send it by email'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Vérifie si les backups sont activés
    const enabledSetting = await Save.findBy('variable', 'backup_enabled')
    if (enabledSetting?.value === 'false') {
      this.logger.warning('Backups are disabled. Skipping...')
      return
    }

    const date = new Date().toISOString().slice(0, 10)
    const filename = `melomania_backup_${date}.sql`
    const backupDir = join(process.cwd(), 'backup')
    const filepath = join(backupDir, filename)

    // Crée le dossier backup s'il n'existe pas
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
      this.logger.info('Created backup directory')
    }

    this.logger.info('Creating database dump...')

    // Chemin vers pg_dump configurable via .env
    const pgDumpPath = process.env.PG_DUMP_PATH ?? 'pg_dump'

    execSync(
      `"${pgDumpPath}" -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_DATABASE} -f "${filepath}"`,
      { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }
    )

    this.logger.info('Sending backup by email...')

    // Récupère l'email de destination depuis les réglages ou le .env
    const emailSetting = await Save.findBy('variable', 'backup_email')
    const destinationEmail = emailSetting?.value ?? process.env.BACKUP_EMAIL!

    await mail.send((message) => {
      message
        .to(destinationEmail)
        .from(process.env.SMTP_USERNAME!)
        .subject(`[Melomania] Database backup - ${date}`)
        .text(`Please find attached the weekly database backup for ${date}.`)
        .attach(filepath, { filename })
    })

    // Enregistre la date du dernier envoi
    let lastBackup = await Save.findBy('variable', 'backup_last_sent')
    if (lastBackup) {
      lastBackup.value = new Date().toISOString()
      await lastBackup.save()
    } else {
      await Save.create({
        variable: 'backup_last_sent',
        value: new Date().toISOString(),
      })
    }

    unlinkSync(filepath)
    this.logger.success('Backup sent successfully!')
  }
}