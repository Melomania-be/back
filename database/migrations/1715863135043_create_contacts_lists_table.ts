import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts_lists'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .integer('contact_id')
        .unsigned()
        .references('id')
        .inTable('contacts')
        .onDelete('CASCADE')
      table.integer('list_id').unsigned().references('id').inTable('lists').onDelete('CASCADE')

      table.primary(['contact_id', 'list_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
