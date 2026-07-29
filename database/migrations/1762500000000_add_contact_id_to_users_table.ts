import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('contact_id').unsigned().nullable().references('contacts.id').onDelete('SET NULL')
      table.unique(['contact_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['contact_id'])
      table.dropColumn('contact_id')
    })
  }
}
