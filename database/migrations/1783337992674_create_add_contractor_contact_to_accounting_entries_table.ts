import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accounting_entries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('contractor_contact_id')
        .unsigned()
        .nullable()
        .references('contractor_contacts.id')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('contractor_contact_id')
    })
  }
}