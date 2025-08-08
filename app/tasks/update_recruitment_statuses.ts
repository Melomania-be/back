// app/tasks/update_recruitment_statuses.ts
import { DateTime } from 'luxon'
import RecruitmentContact from '#models/recruitment_contact'
import RecruitmentSettings from '#models/recruitment_settings'
import { BaseCommand } from '@adonisjs/core/commands'

export default class UpdateRecruitmentStatuses extends BaseCommand {
  static commandName = 'recruitment:update-statuses'
  static description = 'Met à jour automatiquement les statuts de recrutement'

  async run() {
    this.logger.info('Démarrage de la mise à jour des statuts de recrutement')

    try {
      // Récupérer tous les projets avec des paramètres de recrutement
      const settings = await RecruitmentSettings.query()
        .where('auto_follow_up_enabled', true)
        .preload('project')

      let totalUpdated = 0

      for (const setting of settings) {
        const updated = await this.updateProjectStatuses(setting)
        totalUpdated += updated

        this.logger.info(
          `Projet ${setting.project.name}: ${updated} contact(s) mis à jour`
        )
      }

      this.logger.success(
        `Mise à jour terminée: ${totalUpdated} contact(s) au total`
      )

    } catch (error) {
      this.logger.error('Erreur lors de la mise à jour des statuts:')
      this.logger.error(error.message)
      process.exit(1)
    }
  }

  private async updateProjectStatuses(settings: RecruitmentSettings): Promise<number> {
    // Trouver tous les contacts en "awaiting_response" qui dépassent le délai
    const cutoffDate = DateTime.now().minus({ days: settings.follow_up_days })

    const contactsToUpdate = await RecruitmentContact.query()
      .where('project_id', settings.project_id)
      .where('status', 'awaiting_response')
      .where('contact_date', '<=', cutoffDate.toISO())
      .whereNotNull('contact_date')

    // Mettre à jour les statuts
    for (const contact of contactsToUpdate) {
      await contact.merge({
        status: 'to_follow_up',
        last_follow_up: DateTime.now()
      }).save()
    }

    return contactsToUpdate.length
  }
}
