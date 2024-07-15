import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'participants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.timestamp('last_activity').nullable()
      table.boolean('accepted')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table.integer('section_id').unsigned().references('sections.id')
      table.integer('contact_id').unsigned().references('contacts.id').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }
  //.references('contacts.id').
  async down() {
    this.schema.dropTable(this.tableName)
  }
}
