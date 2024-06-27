import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attached_to_mail_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('file_id').unsigned().references('files.id').onDelete('CASCADE')
      table
        .integer('mail_template_id')
        .unsigned()
        .references('mail_templates.id')
        .onDelete('CASCADE')

      table.primary(['file_id', 'mail_template_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
