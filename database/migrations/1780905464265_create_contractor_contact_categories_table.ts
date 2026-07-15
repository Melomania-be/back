import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contractor_contact_categories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('contractor_contact_id')
        .unsigned()
        .references('id')
        .inTable('contractor_contacts')
        .onDelete('CASCADE')

      table
        .integer('contractor_category_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('contractor_categories')
        .onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}