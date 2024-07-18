import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'outgoing_mails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('type')
<<<<<<< Updated upstream
      table.integer('receiver_id').unsigned().references('contacts.id').onDelete('CASCADE')
      table.integer('project_id').unsigned().references('projects.id').onDelete('CASCADE')
      table
        .integer('mail_template_id')
        .unsigned()
        .references('mail_templates.id')
        .onDelete('CASCADE')

=======
      table.integer('receiver_id').unsigned().references('contacts.id')
      table.integer('project_id').unsigned().references('projects.id')
      table.integer('mail_template_id').unsigned().references('mail_templates.id')
      table.boolean('sent')
>>>>>>> Stashed changes
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
