import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'responsibles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('contact_id').unsigned().references('contacts.id').onDelete('CASCADE')
      table.primary(['project_id', 'contact_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
