// database/migrations/1745000000000_create_recruitment_contacts_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_contacts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('contact_id').unsigned().references('contacts.id').onDelete('CASCADE').nullable()

      // Informations contact manuel
      table.string('first_name', 255).notNullable()
      table.string('last_name', 255).notNullable()
      table.string('email', 255).nullable()
      table.string('phone', 255).nullable()
      table.string('messenger', 255).nullable()
      table.integer('section_id').unsigned().references('sections.id').onDelete('SET NULL').nullable()

      // Statut et suivi
      table.enum('status', [
        'not_yet_contacted',
        'awaiting_response',
        'to_follow_up',
        'not_available',
        'pending_validation',
        'cancelled',
        'recruited'
      ]).defaultTo('not_yet_contacted')

      table.enum('contact_method', ['manual', 'email', 'messenger', 'phone']).defaultTo('manual')
      table.timestamp('contact_date').nullable()
      table.timestamp('last_follow_up').nullable()
      table.text('notes').nullable()

      // Recommandation
      table.string('recommended_by').nullable()
      table.integer('recommender_contact_id').unsigned().references('contacts.id').onDelete('SET NULL').nullable()

      // Métadonnées
      table.boolean('is_duplicate').defaultTo(false)
      table.string('source').nullable() // 'database', 'manual', 'recommendation'

      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index
      table.index(['project_id', 'status'])
      table.index(['contact_date'])
      table.unique(['project_id', 'contact_id']) // Éviter les doublons pour les contacts DB
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
