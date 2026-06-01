import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { execSync } from 'node:child_process'
import { unlinkSync } from 'node:fs'
import { join } from 'node:path'
import mail from '@adonisjs/mail/services/main'

export default class BackupDatabase extends BaseCommand {
  static commandName = 'backup:database'
  static description = 'Create a database dump and send it by email'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const date = new Date().toISOString().slice(0, 10)
    const filename = `melomania_backup_${date}.sql`
    const filepath = join('backup', filename)

    this.logger.info('Creating database dump...')

    execSync(
      `"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe" -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_DATABASE} -f ${filepath}`,
      { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }
    )

    this.logger.info('Sending backup by email...')

    await mail.send((message) => {
      message
        .to(process.env.BACKUP_EMAIL!)
        .from(process.env.SMTP_USERNAME!)
        .subject(`[Melomania] Database backup - ${date}`)
        .text(`Please find attached the weekly database backup for ${date}.`)
        .attach(filepath, { filename })
    })

    unlinkSync(filepath)
    this.logger.success('Backup sent successfully!')
  }
}