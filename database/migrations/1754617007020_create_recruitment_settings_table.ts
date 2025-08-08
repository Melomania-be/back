// database/migrations/1745000000001_create_recruitment_settings_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('follow_up_days').defaultTo(7) // Jours avant passage en "to_follow_up"
      table.boolean('auto_follow_up_enabled').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['project_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
