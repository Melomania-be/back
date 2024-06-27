import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'outgoing_mails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('type')
      table.integer('receiver_id').unsigned().references('contacts.id')
      table.integer('project_id').unsigned().references('projects.id')
      table.integer('mail_template_id').unsigned().references('mail_templates.id')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
