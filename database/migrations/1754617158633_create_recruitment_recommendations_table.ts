// database/migrations/1745000000002_create_recruitment_recommendations_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_recommendations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.string('recommender_name', 255).notNullable()
      table.string('recommender_email', 255).nullable()

      // Personne recommandée
      table.string('recommended_first_name', 255).notNullable()
      table.string('recommended_last_name', 255).notNullable()
      table.string('recommended_email', 255).nullable()
      table.string('recommended_phone', 255).nullable()
      table.string('recommended_messenger', 255).nullable()
      table.string('recommended_instrument', 255).nullable()
      table.text('recommendation_message').nullable()

      table.enum('status', ['pending', 'ignored', 'contacted_email', 'contacted_manual']).defaultTo('pending')
      table.integer('recruitment_contact_id').unsigned().references('recruitment_contacts.id').onDelete('SET NULL').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['project_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
